import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
export declare type IterateQueryBuilder<T extends ObjectLiteral = any> = () => SelectQueryBuilder<T>;
export declare type IterateQueryOptions<T extends ObjectLiteral = any> = {
    batch: number;
    iterationKey: string;
    order?: 'ASC' | 'DESC';
    extractor?: (query: SelectQueryBuilder<T>) => Promise<T[]>;
};
export declare type IterateRepositoryOptions<T extends ObjectLiteral = any> = {
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
export declare function iterateRepository<T extends ObjectLiteral>(target: Repository<T> | IterateQueryBuilder<T>, options: IterateRepositoryOptions<T>): AsyncGenerator<T[]>;
/**
 * Iterates a query from a select query builder.
 *
 * @param query
 *   A query factory.
 * @param options
 *   Query iteration options.
 */
export declare function iterateSelectQuery<T extends ObjectLiteral>(query: IterateQueryBuilder<T>, options: IterateQueryOptions): AsyncGenerator<T[]>;
/**
 * Converts a bulk query to per item query.
 *
 * @param iterator
 *   An iterator to convert.
 */
export declare function iterateQueryItems<T>(iterator: AsyncGenerator<T[]>): AsyncGenerator<T>;
/**
 * A simple helper iterator that allows iterating per entity instance of a batch query.
 *
 * @param repository
 *   Target repository.
 * @param options
 *   Iteration options.
 */
export declare function iterateRepositoryEntities<T extends ObjectLiteral>(repository: Repository<T>, options: IterateRepositoryOptions): AsyncGenerator<T>;
