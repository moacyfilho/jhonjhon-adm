import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Listar vendas de produtos
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    // Filtro por produto
    if (productId) {
      where.productId = productId;
    }

    // Filtro por período
    if (startDate || endDate) {
      where.soldAt = {};
      if (startDate) {
        where.soldAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Adiciona 1 dia para incluir todo o último dia
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.soldAt.lt = end;
      }
    }

    const sales = await prisma.productSale.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: true,
          },
        },
      },
      orderBy: {
        soldAt: 'desc',
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Erro ao buscar vendas de produtos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar vendas de produtos' },
      { status: 500 }
    );
  }
}

// POST - Registrar venda de produto
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { productId, quantity, paymentMethod, soldBy, observations } = data;

    // Validações
    if (!productId || !quantity || !paymentMethod) {
      return NextResponse.json(
        { error: 'Produto, quantidade e forma de pagamento são obrigatórios' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantidade deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Buscar produto
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    if (!product.isActive) {
      return NextResponse.json(
        { error: 'Produto não está disponível para venda' },
        { status: 400 }
      );
    }

    // Verificar estoque
    if (product.stock < quantity) {
      return NextResponse.json(
        {
          error: `Estoque insuficiente. Disponível: ${product.stock} ${product.unit}`,
        },
        { status: 400 }
      );
    }

    const unitPrice = product.price;
    const totalAmount = parseFloat((quantity * unitPrice).toFixed(2));

    // Criar venda, atualizar estoque e registrar no caixa em uma transação
    const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Criar venda
      const newSale = await tx.productSale.create({
        data: {
          productId,
          quantity: parseFloat(quantity),
          unitPrice,
          totalAmount,
          paymentMethod,
          soldBy: soldBy || user.email || null,
          observations: observations || null,
        },
        include: {
          product: true,
        },
      });

      // Atualizar estoque
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: {
            decrement: parseFloat(quantity),
          },
        },
      });

      // Verificar se há caixa aberto e registrar movimentação
      const openCashRegister = await tx.cashRegister.findFirst({
        where: { status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });

      if (openCashRegister) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: openCashRegister.id,
            type: 'ENTRY',
            amount: totalAmount,
            description: `Venda de produto: ${product.name} (${quantity} ${product.unit})`,
            category: 'PRODUCT_SALE',
            paymentMethod,
          },
        });
        console.log('Movimentação de caixa registrada automaticamente');
      } else {
        console.log('Nenhum caixa aberto - movimentação não registrada');
      }

      return newSale;
    });

    console.log('Venda de produto registrada:', sale);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar venda de produto:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar venda de produto' },
      { status: 500 }
    );
  }
}
