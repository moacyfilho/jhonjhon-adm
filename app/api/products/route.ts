import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Listar produtos
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const showInactive = searchParams.get('showInactive') === 'true';

    const where: any = {};

    // Filtro de busca por nome
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filtro por categoria
    if (category) {
      where.category = category;
    }

    // Mostrar apenas ativos (padrão) ou todos
    if (!showInactive) {
      where.isActive = true;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

// POST - Criar novo produto
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { name, description, price, stock, unit, category } = data;

    // Validações
    if (!name || !price) {
      return NextResponse.json(
        { error: 'Nome e preço são obrigatórios' },
        { status: 400 }
      );
    }

    if (price < 0) {
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

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        stock: stock !== undefined ? parseFloat(stock) : 0,
        unit: unit || 'un',
        category: category || null,
        isActive: true,
      },
    });

    console.log('Produto criado:', product);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  }
}
