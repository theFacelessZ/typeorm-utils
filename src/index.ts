import {ObjectLiteral, Repository, SelectQueryBuilder} from 'typeorm';

export type IterateQueryBuilder<T extends ObjectLiteral = any> =
  () => SelectQueryBuilder<T>;

export type IterateQueryOptions<T extends ObjectLiteral = any> = {
  batch: number;
  iterationKey: string;
  order?: 'ASC' | 'DESC';
  extractor?: (query: SelectQueryBuilder<T>) => Promise<T[]>;
};

export type IterateRepositoryOptions<T extends ObjectLiteral = any> = {
  batch: number;
  idKey?: string;
} & Omit<IterateQueryOptions<T>, 'iterationKey' | 'extractor'>;

/**
 * Iterates repository with target repository and query.
 *
 * @param target
 *   Target repository or query builder.
 * @param options
 */
export function iterateRepository<T extends ObjectLiteral>(
  target: Repository<T> | IterateQueryBuilder<T>,
  options: IterateRepositoryOptions<T>
): AsyncGenerator<T[]> {
  const query: IterateQueryBuilder<T> =
    target instanceof Repository<T>
      ? () => {
          if (target instanceof Repository) {
            return target.createQueryBuilder();
          }

          throw new Error('Expected a repository.');
        }
      : target;

  const iterationKey =
    target instanceof Repository
      ? target.metadata.primaryColumns[0]?.propertyName
      : options.idKey;

  if (!iterationKey) {
    throw new Error(
      'Failed to determine entity id key. Please specify it explicitly in the options.'
    );
  }

  return iterateSelectQuery(query, {
    extractor: query => query.getMany(),
    iterationKey,
    batch: options.batch,
    order: options.order,
  });
}

/**
 * Iterates a query from a select query builder.
 *
 * @param query
 *   A query factory.
 * @param options
 *   Query iteration options.
 */
export async function* iterateSelectQuery<T extends ObjectLiteral = any>(
  query: IterateQueryBuilder<T>,
  options: IterateQueryOptions
): AsyncGenerator<T[]> {
  const extractor = options.extractor || (query => query.getRawMany());

  let bulk = [];
  let lastValue;

  const total = await query().getCount();
  if (!total) {
    return;
  }

  const keyOperator = (options.order || 'ASC') === 'ASC' ? '>=' : '<=';

  do {
    // Using the value extractor and query factory get the query values.
    const select = query();

    if (typeof lastValue !== 'undefined') {
      select.andWhere(
        `${select.alias}.${options.iterationKey} ${keyOperator} :lastValue`,
        {
          lastValue,
        }
      );
    }

    bulk = await extractor(
      select
        .addOrderBy(
          `${select.alias}.${options.iterationKey}`,
          options.order || 'ASC'
        )
        .take(options.batch + 1)
    );

    yield bulk.slice(0, options.batch);

    lastValue = bulk[bulk.length - 1][options.iterationKey];
  } while (bulk.length >= options.batch);
}

/**
 * Converts a bulk query to per item query.
 *
 * @param iterator
 *   An iterator to convert.
 */
export async function* iterateQueryItems<T>(
  iterator: AsyncGenerator<T[]>
): AsyncGenerator<T> {
  for await (const bulk of iterator) {
    for (const item of bulk) {
      yield item;
    }
  }
}

/**
 * A simple helper iterator that allows iterating per entity instance of a batch query.
 *
 * @param repository
 *   Target repository.
 * @param options
 *   Iteration options.
 */
export function iterateRepositoryEntities<T extends ObjectLiteral = any>(
  repository: Repository<T>,
  options: IterateRepositoryOptions
): AsyncGenerator<T> {
  return iterateQueryItems(iterateRepository(repository, options));
}
