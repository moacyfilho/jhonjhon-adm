import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT - Atualizar produto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const data = await request.json();
    const { name, description, price, stock, unit, category, isActive } = data;

    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Validações
    if (price !== undefined && price < 0) {
      return NextResponse.json(
        { error: 'Preço não pode ser negativo' },
        { status: 400 }
      );
    }

    if (stock !== undefined && stock < 0) {
      return NextResponse.json(
        { error: 'Estoque não pode ser negativo' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (stock !== undefined) updateData.stock = parseFloat(stock);
    if (unit !== undefined) updateData.unit = unit;
    if (category !== undefined) updateData.category = category || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    console.log('Produto atualizado:', product);
    return NextResponse.json(product);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}

// DELETE - Excluir produto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Verificar se produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    // Se produto tem vendas, desativar ao invés de deletar
    if (existingProduct._count.sales > 0) {
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      console.log('Produto desativado (tinha vendas):', product);
      return NextResponse.json({
        message: 'Produto desativado (não pode ser excluído pois possui vendas registradas)',
        product
      });
    }

    // Se não tem vendas, pode deletar
    await prisma.product.delete({
      where: { id },
    });

    console.log('Produto excluído:', id);
    return NextResponse.json({ message: 'Produto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}
