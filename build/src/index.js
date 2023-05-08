"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iterateRepositoryEntities = exports.iterateQueryItems = exports.iterateSelectQuery = exports.iterateRepository = void 0;
const typeorm_1 = require("typeorm");
/**
 * Iterates repository with target repository and query.
 *
 * @param target
 *   Target repository or query builder.
 * @param options
 */
function iterateRepository(target, options) {
    var _a;
    const query = target instanceof (typeorm_1.Repository) ? () => {
        if (target instanceof typeorm_1.Repository) {
            return target.createQueryBuilder();
        }
        throw new Error('Expected a repository.');
    } : target;
    const iterationKey = target instanceof typeorm_1.Repository
        ? (_a = target.metadata.primaryColumns[0]) === null || _a === void 0 ? void 0 : _a.propertyName
        : options.idKey;
    if (!iterationKey) {
        throw new Error('Failed to determine entity id key. Please specify it explicitly in the options.');
    }
    return iterateSelectQuery(query, {
        extractor: (query) => query.getMany(),
        iterationKey,
        batch: options.batch,
        order: options.order,
    });
}
exports.iterateRepository = iterateRepository;
/**
 * Iterates a query from a select query builder.
 *
 * @param query
 *   A query factory.
 * @param options
 *   Query iteration options.
 */
async function* iterateSelectQuery(query, options) {
    const extractor = options.extractor || ((query) => query.getRawMany());
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
            select.andWhere(`${select.alias}.${options.iterationKey} ${keyOperator} :lastValue`, {
                lastValue,
            });
        }
        bulk = await extractor(select
            .addOrderBy(`${select.alias}.${options.iterationKey}`, options.order || 'ASC')
            .take(options.batch + 1));
        yield bulk.slice(0, options.batch);
        lastValue = bulk[bulk.length - 1][options.iterationKey];
    } while (bulk.length >= options.batch);
}
exports.iterateSelectQuery = iterateSelectQuery;
/**
 * Converts a bulk query to per item query.
 *
 * @param iterator
 *   An iterator to convert.
 */
async function* iterateQueryItems(iterator) {
    for await (const bulk of iterator) {
        for (const item of bulk) {
            yield item;
        }
    }
}
exports.iterateQueryItems = iterateQueryItems;
/**
 * A simple helper iterator that allows iterating per entity instance of a batch query.
 *
 * @param repository
 *   Target repository.
 * @param options
 *   Iteration options.
 */
function iterateRepositoryEntities(repository, options) {
    return iterateQueryItems(iterateRepository(repository, options));
}
exports.iterateRepositoryEntities = iterateRepositoryEntities;
//# sourceMappingURL=index.js.map