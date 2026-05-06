import { CursorPaginationHelper, PaginationHelper } from '../../../utils/pagination.helper';

function createQueryBuilderMock(alias: string, rows: { id: number }[]) {
  return {
    alias,
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
}

describe('CursorPaginationHelper', () => {
  it('sin cursor devuelve items y sin nextCursor si no hay página extra', async () => {
    const qb = createQueryBuilderMock('p', [{ id: 1 }, { id: 2 }]);
    const out = await CursorPaginationHelper.paginateWithCursor(qb as any, { limit: 2 }, 'id', 'ASC');
    expect(out.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(out.hasMore).toBe(false);
    expect(out.nextCursor).toBeUndefined();
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('p.id', 'ASC');
    expect(qb.take).toHaveBeenCalledWith(3);
  });

  it('recorta a limit y expone nextCursor cuando hay más filas', async () => {
    const qb = createQueryBuilderMock('p', [{ id: 1 }, { id: 2 }, { id: 3 }]);
    const out = await CursorPaginationHelper.paginateWithCursor(qb as any, { limit: 2 }, 'id', 'ASC');
    expect(out.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(out.hasMore).toBe(true);
    expect(out.nextCursor).toBe(Buffer.from(JSON.stringify(2)).toString('base64'));
  });

  it('con cursor ASC aplica filtro > cursor', async () => {
    const cursor = Buffer.from(JSON.stringify(5)).toString('base64');
    const qb = createQueryBuilderMock('p', [{ id: 6 }]);
    await CursorPaginationHelper.paginateWithCursor(qb as any, { limit: 10, cursor }, 'id', 'ASC');
    expect(qb.andWhere).toHaveBeenCalledWith('p.id > :cursor', { cursor: 5 });
  });

  it('con orden DESC aplica filtro < cursor', async () => {
    const cursor = Buffer.from(JSON.stringify(10)).toString('base64');
    const qb = createQueryBuilderMock('p', [{ id: 9 }]);
    await CursorPaginationHelper.paginateWithCursor(qb as any, { limit: 5, cursor }, 'id', 'DESC');
    expect(qb.andWhere).toHaveBeenCalledWith('p.id < :cursor', { cursor: 10 });
  });

  it('rechaza cursor ilegible', async () => {
    const qb = createQueryBuilderMock('p', []);
    await expect(
      CursorPaginationHelper.paginateWithCursor(qb as any, { cursor: '%%%' }, 'id')
    ).rejects.toThrow('Cursor inválido');
  });

  it('acota limit a 1000', async () => {
    const qb = createQueryBuilderMock('p', []);
    await CursorPaginationHelper.paginateWithCursor(qb as any, { limit: 5000 });
    expect(qb.take).toHaveBeenCalledWith(1001);
  });
});

describe('PaginationHelper', () => {
  describe('calculatePaginationInfo', () => {
    it('calcula totalPages y flags de navegación', () => {
      expect(PaginationHelper.calculatePaginationInfo(100, 1, 25)).toEqual({
        total: 100,
        page: 1,
        limit: 25,
        totalPages: 4,
        hasNextPage: true,
        hasPreviousPage: false,
      });
      expect(PaginationHelper.calculatePaginationInfo(100, 4, 25)).toEqual({
        total: 100,
        page: 4,
        limit: 25,
        totalPages: 4,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('total 0 da totalPages 0 y sin siguiente página', () => {
      const info = PaginationHelper.calculatePaginationInfo(0, 1, 50);
      expect(info.totalPages).toBe(0);
      expect(info.hasNextPage).toBe(false);
    });
  });

  describe('applyPagination', () => {
    it('delega skip y take en el query builder', () => {
      const skip = jest.fn().mockReturnThis();
      const take = jest.fn().mockReturnThis();
      const qb = { skip, take } as any;
      const out = PaginationHelper.applyPagination(qb, 3, 10);
      expect(skip).toHaveBeenCalledWith(20);
      expect(take).toHaveBeenCalledWith(10);
      expect(out).toBe(qb);
    });
  });
});
