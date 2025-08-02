
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Site
 * 
 */
export type Site = $Result.DefaultSelection<Prisma.$SitePayload>
/**
 * Model Subscription
 * 
 */
export type Subscription = $Result.DefaultSelection<Prisma.$SubscriptionPayload>
/**
 * Model Invoices
 * 
 */
export type Invoices = $Result.DefaultSelection<Prisma.$InvoicesPayload>
/**
 * Model Post
 * 
 */
export type Post = $Result.DefaultSelection<Prisma.$PostPayload>
/**
 * Model InvoiceItems
 * 
 */
export type InvoiceItems = $Result.DefaultSelection<Prisma.$InvoiceItemsPayload>
/**
 * Model AIconversation
 * 
 */
export type AIconversation = $Result.DefaultSelection<Prisma.$AIconversationPayload>
/**
 * Model Documents
 * 
 */
export type Documents = $Result.DefaultSelection<Prisma.$DocumentsPayload>
/**
 * Model sitediaryrecords
 * 
 */
export type sitediaryrecords = $Result.DefaultSelection<Prisma.$sitediaryrecordsPayload>
/**
 * Model sitediarysettings
 * 
 */
export type sitediarysettings = $Result.DefaultSelection<Prisma.$sitediarysettingsPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.site`: Exposes CRUD operations for the **Site** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sites
    * const sites = await prisma.site.findMany()
    * ```
    */
  get site(): Prisma.SiteDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.subscription`: Exposes CRUD operations for the **Subscription** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Subscriptions
    * const subscriptions = await prisma.subscription.findMany()
    * ```
    */
  get subscription(): Prisma.SubscriptionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.invoices`: Exposes CRUD operations for the **Invoices** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Invoices
    * const invoices = await prisma.invoices.findMany()
    * ```
    */
  get invoices(): Prisma.InvoicesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.post`: Exposes CRUD operations for the **Post** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Posts
    * const posts = await prisma.post.findMany()
    * ```
    */
  get post(): Prisma.PostDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.invoiceItems`: Exposes CRUD operations for the **InvoiceItems** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more InvoiceItems
    * const invoiceItems = await prisma.invoiceItems.findMany()
    * ```
    */
  get invoiceItems(): Prisma.InvoiceItemsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.aIconversation`: Exposes CRUD operations for the **AIconversation** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AIconversations
    * const aIconversations = await prisma.aIconversation.findMany()
    * ```
    */
  get aIconversation(): Prisma.AIconversationDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.documents`: Exposes CRUD operations for the **Documents** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Documents
    * const documents = await prisma.documents.findMany()
    * ```
    */
  get documents(): Prisma.DocumentsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.sitediaryrecords`: Exposes CRUD operations for the **sitediaryrecords** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sitediaryrecords
    * const sitediaryrecords = await prisma.sitediaryrecords.findMany()
    * ```
    */
  get sitediaryrecords(): Prisma.sitediaryrecordsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.sitediarysettings`: Exposes CRUD operations for the **sitediarysettings** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sitediarysettings
    * const sitediarysettings = await prisma.sitediarysettings.findMany()
    * ```
    */
  get sitediarysettings(): Prisma.sitediarysettingsDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.12.0
   * Query Engine version: 8047c96bbd92db98a2abc7c9323ce77c02c89dbc
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Site: 'Site',
    Subscription: 'Subscription',
    Invoices: 'Invoices',
    Post: 'Post',
    InvoiceItems: 'InvoiceItems',
    AIconversation: 'AIconversation',
    Documents: 'Documents',
    sitediaryrecords: 'sitediaryrecords',
    sitediarysettings: 'sitediarysettings'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "site" | "subscription" | "invoices" | "post" | "invoiceItems" | "aIconversation" | "documents" | "sitediaryrecords" | "sitediarysettings"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Site: {
        payload: Prisma.$SitePayload<ExtArgs>
        fields: Prisma.SiteFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SiteFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SiteFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>
          }
          findFirst: {
            args: Prisma.SiteFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SiteFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>
          }
          findMany: {
            args: Prisma.SiteFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>[]
          }
          create: {
            args: Prisma.SiteCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>
          }
          createMany: {
            args: Prisma.SiteCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SiteCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>[]
          }
          delete: {
            args: Prisma.SiteDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>
          }
          update: {
            args: Prisma.SiteUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>
          }
          deleteMany: {
            args: Prisma.SiteDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SiteUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SiteUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>[]
          }
          upsert: {
            args: Prisma.SiteUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SitePayload>
          }
          aggregate: {
            args: Prisma.SiteAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSite>
          }
          groupBy: {
            args: Prisma.SiteGroupByArgs<ExtArgs>
            result: $Utils.Optional<SiteGroupByOutputType>[]
          }
          count: {
            args: Prisma.SiteCountArgs<ExtArgs>
            result: $Utils.Optional<SiteCountAggregateOutputType> | number
          }
        }
      }
      Subscription: {
        payload: Prisma.$SubscriptionPayload<ExtArgs>
        fields: Prisma.SubscriptionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubscriptionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubscriptionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findFirst: {
            args: Prisma.SubscriptionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubscriptionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          findMany: {
            args: Prisma.SubscriptionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          create: {
            args: Prisma.SubscriptionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          createMany: {
            args: Prisma.SubscriptionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubscriptionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          delete: {
            args: Prisma.SubscriptionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          update: {
            args: Prisma.SubscriptionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          deleteMany: {
            args: Prisma.SubscriptionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubscriptionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SubscriptionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>[]
          }
          upsert: {
            args: Prisma.SubscriptionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubscriptionPayload>
          }
          aggregate: {
            args: Prisma.SubscriptionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubscription>
          }
          groupBy: {
            args: Prisma.SubscriptionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubscriptionCountArgs<ExtArgs>
            result: $Utils.Optional<SubscriptionCountAggregateOutputType> | number
          }
        }
      }
      Invoices: {
        payload: Prisma.$InvoicesPayload<ExtArgs>
        fields: Prisma.InvoicesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InvoicesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InvoicesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>
          }
          findFirst: {
            args: Prisma.InvoicesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InvoicesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>
          }
          findMany: {
            args: Prisma.InvoicesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>[]
          }
          create: {
            args: Prisma.InvoicesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>
          }
          createMany: {
            args: Prisma.InvoicesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InvoicesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>[]
          }
          delete: {
            args: Prisma.InvoicesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>
          }
          update: {
            args: Prisma.InvoicesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>
          }
          deleteMany: {
            args: Prisma.InvoicesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InvoicesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InvoicesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>[]
          }
          upsert: {
            args: Prisma.InvoicesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoicesPayload>
          }
          aggregate: {
            args: Prisma.InvoicesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInvoices>
          }
          groupBy: {
            args: Prisma.InvoicesGroupByArgs<ExtArgs>
            result: $Utils.Optional<InvoicesGroupByOutputType>[]
          }
          count: {
            args: Prisma.InvoicesCountArgs<ExtArgs>
            result: $Utils.Optional<InvoicesCountAggregateOutputType> | number
          }
        }
      }
      Post: {
        payload: Prisma.$PostPayload<ExtArgs>
        fields: Prisma.PostFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PostFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PostFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          findFirst: {
            args: Prisma.PostFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PostFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          findMany: {
            args: Prisma.PostFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>[]
          }
          create: {
            args: Prisma.PostCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          createMany: {
            args: Prisma.PostCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PostCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>[]
          }
          delete: {
            args: Prisma.PostDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          update: {
            args: Prisma.PostUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          deleteMany: {
            args: Prisma.PostDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PostUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.PostUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>[]
          }
          upsert: {
            args: Prisma.PostUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PostPayload>
          }
          aggregate: {
            args: Prisma.PostAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePost>
          }
          groupBy: {
            args: Prisma.PostGroupByArgs<ExtArgs>
            result: $Utils.Optional<PostGroupByOutputType>[]
          }
          count: {
            args: Prisma.PostCountArgs<ExtArgs>
            result: $Utils.Optional<PostCountAggregateOutputType> | number
          }
        }
      }
      InvoiceItems: {
        payload: Prisma.$InvoiceItemsPayload<ExtArgs>
        fields: Prisma.InvoiceItemsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.InvoiceItemsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.InvoiceItemsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>
          }
          findFirst: {
            args: Prisma.InvoiceItemsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.InvoiceItemsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>
          }
          findMany: {
            args: Prisma.InvoiceItemsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>[]
          }
          create: {
            args: Prisma.InvoiceItemsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>
          }
          createMany: {
            args: Prisma.InvoiceItemsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.InvoiceItemsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>[]
          }
          delete: {
            args: Prisma.InvoiceItemsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>
          }
          update: {
            args: Prisma.InvoiceItemsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>
          }
          deleteMany: {
            args: Prisma.InvoiceItemsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.InvoiceItemsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.InvoiceItemsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>[]
          }
          upsert: {
            args: Prisma.InvoiceItemsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$InvoiceItemsPayload>
          }
          aggregate: {
            args: Prisma.InvoiceItemsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateInvoiceItems>
          }
          groupBy: {
            args: Prisma.InvoiceItemsGroupByArgs<ExtArgs>
            result: $Utils.Optional<InvoiceItemsGroupByOutputType>[]
          }
          count: {
            args: Prisma.InvoiceItemsCountArgs<ExtArgs>
            result: $Utils.Optional<InvoiceItemsCountAggregateOutputType> | number
          }
        }
      }
      AIconversation: {
        payload: Prisma.$AIconversationPayload<ExtArgs>
        fields: Prisma.AIconversationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AIconversationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AIconversationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>
          }
          findFirst: {
            args: Prisma.AIconversationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AIconversationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>
          }
          findMany: {
            args: Prisma.AIconversationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>[]
          }
          create: {
            args: Prisma.AIconversationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>
          }
          createMany: {
            args: Prisma.AIconversationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AIconversationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>[]
          }
          delete: {
            args: Prisma.AIconversationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>
          }
          update: {
            args: Prisma.AIconversationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>
          }
          deleteMany: {
            args: Prisma.AIconversationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AIconversationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AIconversationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>[]
          }
          upsert: {
            args: Prisma.AIconversationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AIconversationPayload>
          }
          aggregate: {
            args: Prisma.AIconversationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAIconversation>
          }
          groupBy: {
            args: Prisma.AIconversationGroupByArgs<ExtArgs>
            result: $Utils.Optional<AIconversationGroupByOutputType>[]
          }
          count: {
            args: Prisma.AIconversationCountArgs<ExtArgs>
            result: $Utils.Optional<AIconversationCountAggregateOutputType> | number
          }
        }
      }
      Documents: {
        payload: Prisma.$DocumentsPayload<ExtArgs>
        fields: Prisma.DocumentsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DocumentsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DocumentsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>
          }
          findFirst: {
            args: Prisma.DocumentsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DocumentsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>
          }
          findMany: {
            args: Prisma.DocumentsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>[]
          }
          create: {
            args: Prisma.DocumentsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>
          }
          createMany: {
            args: Prisma.DocumentsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DocumentsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>[]
          }
          delete: {
            args: Prisma.DocumentsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>
          }
          update: {
            args: Prisma.DocumentsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>
          }
          deleteMany: {
            args: Prisma.DocumentsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DocumentsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DocumentsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>[]
          }
          upsert: {
            args: Prisma.DocumentsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DocumentsPayload>
          }
          aggregate: {
            args: Prisma.DocumentsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDocuments>
          }
          groupBy: {
            args: Prisma.DocumentsGroupByArgs<ExtArgs>
            result: $Utils.Optional<DocumentsGroupByOutputType>[]
          }
          count: {
            args: Prisma.DocumentsCountArgs<ExtArgs>
            result: $Utils.Optional<DocumentsCountAggregateOutputType> | number
          }
        }
      }
      sitediaryrecords: {
        payload: Prisma.$sitediaryrecordsPayload<ExtArgs>
        fields: Prisma.sitediaryrecordsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.sitediaryrecordsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.sitediaryrecordsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>
          }
          findFirst: {
            args: Prisma.sitediaryrecordsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.sitediaryrecordsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>
          }
          findMany: {
            args: Prisma.sitediaryrecordsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>[]
          }
          create: {
            args: Prisma.sitediaryrecordsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>
          }
          createMany: {
            args: Prisma.sitediaryrecordsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.sitediaryrecordsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>[]
          }
          delete: {
            args: Prisma.sitediaryrecordsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>
          }
          update: {
            args: Prisma.sitediaryrecordsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>
          }
          deleteMany: {
            args: Prisma.sitediaryrecordsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.sitediaryrecordsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.sitediaryrecordsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>[]
          }
          upsert: {
            args: Prisma.sitediaryrecordsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediaryrecordsPayload>
          }
          aggregate: {
            args: Prisma.SitediaryrecordsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSitediaryrecords>
          }
          groupBy: {
            args: Prisma.sitediaryrecordsGroupByArgs<ExtArgs>
            result: $Utils.Optional<SitediaryrecordsGroupByOutputType>[]
          }
          count: {
            args: Prisma.sitediaryrecordsCountArgs<ExtArgs>
            result: $Utils.Optional<SitediaryrecordsCountAggregateOutputType> | number
          }
        }
      }
      sitediarysettings: {
        payload: Prisma.$sitediarysettingsPayload<ExtArgs>
        fields: Prisma.sitediarysettingsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.sitediarysettingsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.sitediarysettingsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>
          }
          findFirst: {
            args: Prisma.sitediarysettingsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.sitediarysettingsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>
          }
          findMany: {
            args: Prisma.sitediarysettingsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>[]
          }
          create: {
            args: Prisma.sitediarysettingsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>
          }
          createMany: {
            args: Prisma.sitediarysettingsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.sitediarysettingsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>[]
          }
          delete: {
            args: Prisma.sitediarysettingsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>
          }
          update: {
            args: Prisma.sitediarysettingsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>
          }
          deleteMany: {
            args: Prisma.sitediarysettingsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.sitediarysettingsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.sitediarysettingsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>[]
          }
          upsert: {
            args: Prisma.sitediarysettingsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sitediarysettingsPayload>
          }
          aggregate: {
            args: Prisma.SitediarysettingsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSitediarysettings>
          }
          groupBy: {
            args: Prisma.sitediarysettingsGroupByArgs<ExtArgs>
            result: $Utils.Optional<SitediarysettingsGroupByOutputType>[]
          }
          count: {
            args: Prisma.sitediarysettingsCountArgs<ExtArgs>
            result: $Utils.Optional<SitediarysettingsCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    site?: SiteOmit
    subscription?: SubscriptionOmit
    invoices?: InvoicesOmit
    post?: PostOmit
    invoiceItems?: InvoiceItemsOmit
    aIconversation?: AIconversationOmit
    documents?: DocumentsOmit
    sitediaryrecords?: sitediaryrecordsOmit
    sitediarysettings?: sitediarysettingsOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    Site: number
    posts: number
    Invoices: number
    Documents: number
    sitediaryrecords: number
    AIconversation: number
    sitediarysettings: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    Site?: boolean | UserCountOutputTypeCountSiteArgs
    posts?: boolean | UserCountOutputTypeCountPostsArgs
    Invoices?: boolean | UserCountOutputTypeCountInvoicesArgs
    Documents?: boolean | UserCountOutputTypeCountDocumentsArgs
    sitediaryrecords?: boolean | UserCountOutputTypeCountSitediaryrecordsArgs
    AIconversation?: boolean | UserCountOutputTypeCountAIconversationArgs
    sitediarysettings?: boolean | UserCountOutputTypeCountSitediarysettingsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SiteWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountPostsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PostWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountInvoicesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InvoicesWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountDocumentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentsWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSitediaryrecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: sitediaryrecordsWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAIconversationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIconversationWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSitediarysettingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: sitediarysettingsWhereInput
  }


  /**
   * Count Type SiteCountOutputType
   */

  export type SiteCountOutputType = {
    posts: number
    invoices: number
    InvoiceItems: number
    Documents: number
    sitediaryrecords: number
  }

  export type SiteCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    posts?: boolean | SiteCountOutputTypeCountPostsArgs
    invoices?: boolean | SiteCountOutputTypeCountInvoicesArgs
    InvoiceItems?: boolean | SiteCountOutputTypeCountInvoiceItemsArgs
    Documents?: boolean | SiteCountOutputTypeCountDocumentsArgs
    sitediaryrecords?: boolean | SiteCountOutputTypeCountSitediaryrecordsArgs
  }

  // Custom InputTypes
  /**
   * SiteCountOutputType without action
   */
  export type SiteCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SiteCountOutputType
     */
    select?: SiteCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * SiteCountOutputType without action
   */
  export type SiteCountOutputTypeCountPostsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PostWhereInput
  }

  /**
   * SiteCountOutputType without action
   */
  export type SiteCountOutputTypeCountInvoicesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InvoicesWhereInput
  }

  /**
   * SiteCountOutputType without action
   */
  export type SiteCountOutputTypeCountInvoiceItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InvoiceItemsWhereInput
  }

  /**
   * SiteCountOutputType without action
   */
  export type SiteCountOutputTypeCountDocumentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentsWhereInput
  }

  /**
   * SiteCountOutputType without action
   */
  export type SiteCountOutputTypeCountSitediaryrecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: sitediaryrecordsWhereInput
  }


  /**
   * Count Type InvoicesCountOutputType
   */

  export type InvoicesCountOutputType = {
    items: number
  }

  export type InvoicesCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | InvoicesCountOutputTypeCountItemsArgs
  }

  // Custom InputTypes
  /**
   * InvoicesCountOutputType without action
   */
  export type InvoicesCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoicesCountOutputType
     */
    select?: InvoicesCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * InvoicesCountOutputType without action
   */
  export type InvoicesCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InvoiceItemsWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    firstName: string | null
    lastName: string | null
    profileImage: string | null
    customerId: string | null
    createdAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    firstName: string | null
    lastName: string | null
    profileImage: string | null
    customerId: string | null
    createdAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    firstName: number
    lastName: number
    profileImage: number
    customerId: number
    createdAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    firstName?: true
    lastName?: true
    profileImage?: true
    customerId?: true
    createdAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    firstName?: true
    lastName?: true
    profileImage?: true
    customerId?: true
    createdAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    firstName?: true
    lastName?: true
    profileImage?: true
    customerId?: true
    createdAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId: string | null
    createdAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    profileImage?: boolean
    customerId?: boolean
    createdAt?: boolean
    Site?: boolean | User$SiteArgs<ExtArgs>
    posts?: boolean | User$postsArgs<ExtArgs>
    Invoices?: boolean | User$InvoicesArgs<ExtArgs>
    Documents?: boolean | User$DocumentsArgs<ExtArgs>
    sitediaryrecords?: boolean | User$sitediaryrecordsArgs<ExtArgs>
    Subscription?: boolean | User$SubscriptionArgs<ExtArgs>
    AIconversation?: boolean | User$AIconversationArgs<ExtArgs>
    sitediarysettings?: boolean | User$sitediarysettingsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    profileImage?: boolean
    customerId?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    profileImage?: boolean
    customerId?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    firstName?: boolean
    lastName?: boolean
    profileImage?: boolean
    customerId?: boolean
    createdAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "firstName" | "lastName" | "profileImage" | "customerId" | "createdAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    Site?: boolean | User$SiteArgs<ExtArgs>
    posts?: boolean | User$postsArgs<ExtArgs>
    Invoices?: boolean | User$InvoicesArgs<ExtArgs>
    Documents?: boolean | User$DocumentsArgs<ExtArgs>
    sitediaryrecords?: boolean | User$sitediaryrecordsArgs<ExtArgs>
    Subscription?: boolean | User$SubscriptionArgs<ExtArgs>
    AIconversation?: boolean | User$AIconversationArgs<ExtArgs>
    sitediarysettings?: boolean | User$sitediarysettingsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      Site: Prisma.$SitePayload<ExtArgs>[]
      posts: Prisma.$PostPayload<ExtArgs>[]
      Invoices: Prisma.$InvoicesPayload<ExtArgs>[]
      Documents: Prisma.$DocumentsPayload<ExtArgs>[]
      sitediaryrecords: Prisma.$sitediaryrecordsPayload<ExtArgs>[]
      Subscription: Prisma.$SubscriptionPayload<ExtArgs> | null
      AIconversation: Prisma.$AIconversationPayload<ExtArgs>[]
      sitediarysettings: Prisma.$sitediarysettingsPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      firstName: string
      lastName: string
      profileImage: string
      customerId: string | null
      createdAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    Site<T extends User$SiteArgs<ExtArgs> = {}>(args?: Subset<T, User$SiteArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    posts<T extends User$postsArgs<ExtArgs> = {}>(args?: Subset<T, User$postsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    Invoices<T extends User$InvoicesArgs<ExtArgs> = {}>(args?: Subset<T, User$InvoicesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    Documents<T extends User$DocumentsArgs<ExtArgs> = {}>(args?: Subset<T, User$DocumentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sitediaryrecords<T extends User$sitediaryrecordsArgs<ExtArgs> = {}>(args?: Subset<T, User$sitediaryrecordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    Subscription<T extends User$SubscriptionArgs<ExtArgs> = {}>(args?: Subset<T, User$SubscriptionArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    AIconversation<T extends User$AIconversationArgs<ExtArgs> = {}>(args?: Subset<T, User$AIconversationArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sitediarysettings<T extends User$sitediarysettingsArgs<ExtArgs> = {}>(args?: Subset<T, User$sitediarysettingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly firstName: FieldRef<"User", 'String'>
    readonly lastName: FieldRef<"User", 'String'>
    readonly profileImage: FieldRef<"User", 'String'>
    readonly customerId: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.Site
   */
  export type User$SiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
    orderBy?: SiteOrderByWithRelationInput | SiteOrderByWithRelationInput[]
    cursor?: SiteWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SiteScalarFieldEnum | SiteScalarFieldEnum[]
  }

  /**
   * User.posts
   */
  export type User$postsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    where?: PostWhereInput
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    cursor?: PostWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * User.Invoices
   */
  export type User$InvoicesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    where?: InvoicesWhereInput
    orderBy?: InvoicesOrderByWithRelationInput | InvoicesOrderByWithRelationInput[]
    cursor?: InvoicesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InvoicesScalarFieldEnum | InvoicesScalarFieldEnum[]
  }

  /**
   * User.Documents
   */
  export type User$DocumentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    where?: DocumentsWhereInput
    orderBy?: DocumentsOrderByWithRelationInput | DocumentsOrderByWithRelationInput[]
    cursor?: DocumentsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DocumentsScalarFieldEnum | DocumentsScalarFieldEnum[]
  }

  /**
   * User.sitediaryrecords
   */
  export type User$sitediaryrecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    where?: sitediaryrecordsWhereInput
    orderBy?: sitediaryrecordsOrderByWithRelationInput | sitediaryrecordsOrderByWithRelationInput[]
    cursor?: sitediaryrecordsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SitediaryrecordsScalarFieldEnum | SitediaryrecordsScalarFieldEnum[]
  }

  /**
   * User.Subscription
   */
  export type User$SubscriptionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    where?: SubscriptionWhereInput
  }

  /**
   * User.AIconversation
   */
  export type User$AIconversationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    where?: AIconversationWhereInput
    orderBy?: AIconversationOrderByWithRelationInput | AIconversationOrderByWithRelationInput[]
    cursor?: AIconversationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AIconversationScalarFieldEnum | AIconversationScalarFieldEnum[]
  }

  /**
   * User.sitediarysettings
   */
  export type User$sitediarysettingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    where?: sitediarysettingsWhereInput
    orderBy?: sitediarysettingsOrderByWithRelationInput | sitediarysettingsOrderByWithRelationInput[]
    cursor?: sitediarysettingsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SitediarysettingsScalarFieldEnum | SitediarysettingsScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Site
   */

  export type AggregateSite = {
    _count: SiteCountAggregateOutputType | null
    _min: SiteMinAggregateOutputType | null
    _max: SiteMaxAggregateOutputType | null
  }

  export type SiteMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    subdirectory: string | null
    createdAt: Date | null
    updatedAt: Date | null
    imageUrl: string | null
    userId: string | null
  }

  export type SiteMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    subdirectory: string | null
    createdAt: Date | null
    updatedAt: Date | null
    imageUrl: string | null
    userId: string | null
  }

  export type SiteCountAggregateOutputType = {
    id: number
    name: number
    description: number
    subdirectory: number
    createdAt: number
    updatedAt: number
    imageUrl: number
    userId: number
    _all: number
  }


  export type SiteMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    subdirectory?: true
    createdAt?: true
    updatedAt?: true
    imageUrl?: true
    userId?: true
  }

  export type SiteMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    subdirectory?: true
    createdAt?: true
    updatedAt?: true
    imageUrl?: true
    userId?: true
  }

  export type SiteCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    subdirectory?: true
    createdAt?: true
    updatedAt?: true
    imageUrl?: true
    userId?: true
    _all?: true
  }

  export type SiteAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Site to aggregate.
     */
    where?: SiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sites to fetch.
     */
    orderBy?: SiteOrderByWithRelationInput | SiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sites.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sites
    **/
    _count?: true | SiteCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SiteMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SiteMaxAggregateInputType
  }

  export type GetSiteAggregateType<T extends SiteAggregateArgs> = {
        [P in keyof T & keyof AggregateSite]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSite[P]>
      : GetScalarType<T[P], AggregateSite[P]>
  }




  export type SiteGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SiteWhereInput
    orderBy?: SiteOrderByWithAggregationInput | SiteOrderByWithAggregationInput[]
    by: SiteScalarFieldEnum[] | SiteScalarFieldEnum
    having?: SiteScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SiteCountAggregateInputType | true
    _min?: SiteMinAggregateInputType
    _max?: SiteMaxAggregateInputType
  }

  export type SiteGroupByOutputType = {
    id: string
    name: string
    description: string
    subdirectory: string
    createdAt: Date
    updatedAt: Date
    imageUrl: string | null
    userId: string | null
    _count: SiteCountAggregateOutputType | null
    _min: SiteMinAggregateOutputType | null
    _max: SiteMaxAggregateOutputType | null
  }

  type GetSiteGroupByPayload<T extends SiteGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SiteGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SiteGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SiteGroupByOutputType[P]>
            : GetScalarType<T[P], SiteGroupByOutputType[P]>
        }
      >
    >


  export type SiteSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    subdirectory?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    imageUrl?: boolean
    userId?: boolean
    User?: boolean | Site$UserArgs<ExtArgs>
    posts?: boolean | Site$postsArgs<ExtArgs>
    invoices?: boolean | Site$invoicesArgs<ExtArgs>
    InvoiceItems?: boolean | Site$InvoiceItemsArgs<ExtArgs>
    Documents?: boolean | Site$DocumentsArgs<ExtArgs>
    sitediaryrecords?: boolean | Site$sitediaryrecordsArgs<ExtArgs>
    AIconversation?: boolean | Site$AIconversationArgs<ExtArgs>
    sitediarysettings?: boolean | Site$sitediarysettingsArgs<ExtArgs>
    _count?: boolean | SiteCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["site"]>

  export type SiteSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    subdirectory?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    imageUrl?: boolean
    userId?: boolean
    User?: boolean | Site$UserArgs<ExtArgs>
  }, ExtArgs["result"]["site"]>

  export type SiteSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    subdirectory?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    imageUrl?: boolean
    userId?: boolean
    User?: boolean | Site$UserArgs<ExtArgs>
  }, ExtArgs["result"]["site"]>

  export type SiteSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    subdirectory?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    imageUrl?: boolean
    userId?: boolean
  }

  export type SiteOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "description" | "subdirectory" | "createdAt" | "updatedAt" | "imageUrl" | "userId", ExtArgs["result"]["site"]>
  export type SiteInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Site$UserArgs<ExtArgs>
    posts?: boolean | Site$postsArgs<ExtArgs>
    invoices?: boolean | Site$invoicesArgs<ExtArgs>
    InvoiceItems?: boolean | Site$InvoiceItemsArgs<ExtArgs>
    Documents?: boolean | Site$DocumentsArgs<ExtArgs>
    sitediaryrecords?: boolean | Site$sitediaryrecordsArgs<ExtArgs>
    AIconversation?: boolean | Site$AIconversationArgs<ExtArgs>
    sitediarysettings?: boolean | Site$sitediarysettingsArgs<ExtArgs>
    _count?: boolean | SiteCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type SiteIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Site$UserArgs<ExtArgs>
  }
  export type SiteIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Site$UserArgs<ExtArgs>
  }

  export type $SitePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Site"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
      posts: Prisma.$PostPayload<ExtArgs>[]
      invoices: Prisma.$InvoicesPayload<ExtArgs>[]
      InvoiceItems: Prisma.$InvoiceItemsPayload<ExtArgs>[]
      Documents: Prisma.$DocumentsPayload<ExtArgs>[]
      sitediaryrecords: Prisma.$sitediaryrecordsPayload<ExtArgs>[]
      AIconversation: Prisma.$AIconversationPayload<ExtArgs> | null
      sitediarysettings: Prisma.$sitediarysettingsPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string
      subdirectory: string
      createdAt: Date
      updatedAt: Date
      imageUrl: string | null
      userId: string | null
    }, ExtArgs["result"]["site"]>
    composites: {}
  }

  type SiteGetPayload<S extends boolean | null | undefined | SiteDefaultArgs> = $Result.GetResult<Prisma.$SitePayload, S>

  type SiteCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SiteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SiteCountAggregateInputType | true
    }

  export interface SiteDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Site'], meta: { name: 'Site' } }
    /**
     * Find zero or one Site that matches the filter.
     * @param {SiteFindUniqueArgs} args - Arguments to find a Site
     * @example
     * // Get one Site
     * const site = await prisma.site.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SiteFindUniqueArgs>(args: SelectSubset<T, SiteFindUniqueArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Site that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SiteFindUniqueOrThrowArgs} args - Arguments to find a Site
     * @example
     * // Get one Site
     * const site = await prisma.site.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SiteFindUniqueOrThrowArgs>(args: SelectSubset<T, SiteFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Site that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SiteFindFirstArgs} args - Arguments to find a Site
     * @example
     * // Get one Site
     * const site = await prisma.site.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SiteFindFirstArgs>(args?: SelectSubset<T, SiteFindFirstArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Site that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SiteFindFirstOrThrowArgs} args - Arguments to find a Site
     * @example
     * // Get one Site
     * const site = await prisma.site.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SiteFindFirstOrThrowArgs>(args?: SelectSubset<T, SiteFindFirstOrThrowArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sites that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SiteFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sites
     * const sites = await prisma.site.findMany()
     * 
     * // Get first 10 Sites
     * const sites = await prisma.site.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const siteWithIdOnly = await prisma.site.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SiteFindManyArgs>(args?: SelectSubset<T, SiteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Site.
     * @param {SiteCreateArgs} args - Arguments to create a Site.
     * @example
     * // Create one Site
     * const Site = await prisma.site.create({
     *   data: {
     *     // ... data to create a Site
     *   }
     * })
     * 
     */
    create<T extends SiteCreateArgs>(args: SelectSubset<T, SiteCreateArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sites.
     * @param {SiteCreateManyArgs} args - Arguments to create many Sites.
     * @example
     * // Create many Sites
     * const site = await prisma.site.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SiteCreateManyArgs>(args?: SelectSubset<T, SiteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sites and returns the data saved in the database.
     * @param {SiteCreateManyAndReturnArgs} args - Arguments to create many Sites.
     * @example
     * // Create many Sites
     * const site = await prisma.site.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sites and only return the `id`
     * const siteWithIdOnly = await prisma.site.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SiteCreateManyAndReturnArgs>(args?: SelectSubset<T, SiteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Site.
     * @param {SiteDeleteArgs} args - Arguments to delete one Site.
     * @example
     * // Delete one Site
     * const Site = await prisma.site.delete({
     *   where: {
     *     // ... filter to delete one Site
     *   }
     * })
     * 
     */
    delete<T extends SiteDeleteArgs>(args: SelectSubset<T, SiteDeleteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Site.
     * @param {SiteUpdateArgs} args - Arguments to update one Site.
     * @example
     * // Update one Site
     * const site = await prisma.site.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SiteUpdateArgs>(args: SelectSubset<T, SiteUpdateArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sites.
     * @param {SiteDeleteManyArgs} args - Arguments to filter Sites to delete.
     * @example
     * // Delete a few Sites
     * const { count } = await prisma.site.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SiteDeleteManyArgs>(args?: SelectSubset<T, SiteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sites.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SiteUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sites
     * const site = await prisma.site.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SiteUpdateManyArgs>(args: SelectSubset<T, SiteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sites and returns the data updated in the database.
     * @param {SiteUpdateManyAndReturnArgs} args - Arguments to update many Sites.
     * @example
     * // Update many Sites
     * const site = await prisma.site.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sites and only return the `id`
     * const siteWithIdOnly = await prisma.site.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SiteUpdateManyAndReturnArgs>(args: SelectSubset<T, SiteUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Site.
     * @param {SiteUpsertArgs} args - Arguments to update or create a Site.
     * @example
     * // Update or create a Site
     * const site = await prisma.site.upsert({
     *   create: {
     *     // ... data to create a Site
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Site we want to update
     *   }
     * })
     */
    upsert<T extends SiteUpsertArgs>(args: SelectSubset<T, SiteUpsertArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sites.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SiteCountArgs} args - Arguments to filter Sites to count.
     * @example
     * // Count the number of Sites
     * const count = await prisma.site.count({
     *   where: {
     *     // ... the filter for the Sites we want to count
     *   }
     * })
    **/
    count<T extends SiteCountArgs>(
      args?: Subset<T, SiteCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SiteCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Site.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SiteAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SiteAggregateArgs>(args: Subset<T, SiteAggregateArgs>): Prisma.PrismaPromise<GetSiteAggregateType<T>>

    /**
     * Group by Site.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SiteGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SiteGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SiteGroupByArgs['orderBy'] }
        : { orderBy?: SiteGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SiteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSiteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Site model
   */
  readonly fields: SiteFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Site.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SiteClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends Site$UserArgs<ExtArgs> = {}>(args?: Subset<T, Site$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    posts<T extends Site$postsArgs<ExtArgs> = {}>(args?: Subset<T, Site$postsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    invoices<T extends Site$invoicesArgs<ExtArgs> = {}>(args?: Subset<T, Site$invoicesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    InvoiceItems<T extends Site$InvoiceItemsArgs<ExtArgs> = {}>(args?: Subset<T, Site$InvoiceItemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    Documents<T extends Site$DocumentsArgs<ExtArgs> = {}>(args?: Subset<T, Site$DocumentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sitediaryrecords<T extends Site$sitediaryrecordsArgs<ExtArgs> = {}>(args?: Subset<T, Site$sitediaryrecordsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    AIconversation<T extends Site$AIconversationArgs<ExtArgs> = {}>(args?: Subset<T, Site$AIconversationArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    sitediarysettings<T extends Site$sitediarysettingsArgs<ExtArgs> = {}>(args?: Subset<T, Site$sitediarysettingsArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Site model
   */
  interface SiteFieldRefs {
    readonly id: FieldRef<"Site", 'String'>
    readonly name: FieldRef<"Site", 'String'>
    readonly description: FieldRef<"Site", 'String'>
    readonly subdirectory: FieldRef<"Site", 'String'>
    readonly createdAt: FieldRef<"Site", 'DateTime'>
    readonly updatedAt: FieldRef<"Site", 'DateTime'>
    readonly imageUrl: FieldRef<"Site", 'String'>
    readonly userId: FieldRef<"Site", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Site findUnique
   */
  export type SiteFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * Filter, which Site to fetch.
     */
    where: SiteWhereUniqueInput
  }

  /**
   * Site findUniqueOrThrow
   */
  export type SiteFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * Filter, which Site to fetch.
     */
    where: SiteWhereUniqueInput
  }

  /**
   * Site findFirst
   */
  export type SiteFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * Filter, which Site to fetch.
     */
    where?: SiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sites to fetch.
     */
    orderBy?: SiteOrderByWithRelationInput | SiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sites.
     */
    cursor?: SiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sites.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sites.
     */
    distinct?: SiteScalarFieldEnum | SiteScalarFieldEnum[]
  }

  /**
   * Site findFirstOrThrow
   */
  export type SiteFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * Filter, which Site to fetch.
     */
    where?: SiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sites to fetch.
     */
    orderBy?: SiteOrderByWithRelationInput | SiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sites.
     */
    cursor?: SiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sites.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sites.
     */
    distinct?: SiteScalarFieldEnum | SiteScalarFieldEnum[]
  }

  /**
   * Site findMany
   */
  export type SiteFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * Filter, which Sites to fetch.
     */
    where?: SiteWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sites to fetch.
     */
    orderBy?: SiteOrderByWithRelationInput | SiteOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sites.
     */
    cursor?: SiteWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sites from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sites.
     */
    skip?: number
    distinct?: SiteScalarFieldEnum | SiteScalarFieldEnum[]
  }

  /**
   * Site create
   */
  export type SiteCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * The data needed to create a Site.
     */
    data: XOR<SiteCreateInput, SiteUncheckedCreateInput>
  }

  /**
   * Site createMany
   */
  export type SiteCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sites.
     */
    data: SiteCreateManyInput | SiteCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Site createManyAndReturn
   */
  export type SiteCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * The data used to create many Sites.
     */
    data: SiteCreateManyInput | SiteCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Site update
   */
  export type SiteUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * The data needed to update a Site.
     */
    data: XOR<SiteUpdateInput, SiteUncheckedUpdateInput>
    /**
     * Choose, which Site to update.
     */
    where: SiteWhereUniqueInput
  }

  /**
   * Site updateMany
   */
  export type SiteUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sites.
     */
    data: XOR<SiteUpdateManyMutationInput, SiteUncheckedUpdateManyInput>
    /**
     * Filter which Sites to update
     */
    where?: SiteWhereInput
    /**
     * Limit how many Sites to update.
     */
    limit?: number
  }

  /**
   * Site updateManyAndReturn
   */
  export type SiteUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * The data used to update Sites.
     */
    data: XOR<SiteUpdateManyMutationInput, SiteUncheckedUpdateManyInput>
    /**
     * Filter which Sites to update
     */
    where?: SiteWhereInput
    /**
     * Limit how many Sites to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Site upsert
   */
  export type SiteUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * The filter to search for the Site to update in case it exists.
     */
    where: SiteWhereUniqueInput
    /**
     * In case the Site found by the `where` argument doesn't exist, create a new Site with this data.
     */
    create: XOR<SiteCreateInput, SiteUncheckedCreateInput>
    /**
     * In case the Site was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SiteUpdateInput, SiteUncheckedUpdateInput>
  }

  /**
   * Site delete
   */
  export type SiteDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    /**
     * Filter which Site to delete.
     */
    where: SiteWhereUniqueInput
  }

  /**
   * Site deleteMany
   */
  export type SiteDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sites to delete
     */
    where?: SiteWhereInput
    /**
     * Limit how many Sites to delete.
     */
    limit?: number
  }

  /**
   * Site.User
   */
  export type Site$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Site.posts
   */
  export type Site$postsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    where?: PostWhereInput
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    cursor?: PostWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Site.invoices
   */
  export type Site$invoicesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    where?: InvoicesWhereInput
    orderBy?: InvoicesOrderByWithRelationInput | InvoicesOrderByWithRelationInput[]
    cursor?: InvoicesWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InvoicesScalarFieldEnum | InvoicesScalarFieldEnum[]
  }

  /**
   * Site.InvoiceItems
   */
  export type Site$InvoiceItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    where?: InvoiceItemsWhereInput
    orderBy?: InvoiceItemsOrderByWithRelationInput | InvoiceItemsOrderByWithRelationInput[]
    cursor?: InvoiceItemsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InvoiceItemsScalarFieldEnum | InvoiceItemsScalarFieldEnum[]
  }

  /**
   * Site.Documents
   */
  export type Site$DocumentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    where?: DocumentsWhereInput
    orderBy?: DocumentsOrderByWithRelationInput | DocumentsOrderByWithRelationInput[]
    cursor?: DocumentsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DocumentsScalarFieldEnum | DocumentsScalarFieldEnum[]
  }

  /**
   * Site.sitediaryrecords
   */
  export type Site$sitediaryrecordsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    where?: sitediaryrecordsWhereInput
    orderBy?: sitediaryrecordsOrderByWithRelationInput | sitediaryrecordsOrderByWithRelationInput[]
    cursor?: sitediaryrecordsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SitediaryrecordsScalarFieldEnum | SitediaryrecordsScalarFieldEnum[]
  }

  /**
   * Site.AIconversation
   */
  export type Site$AIconversationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    where?: AIconversationWhereInput
  }

  /**
   * Site.sitediarysettings
   */
  export type Site$sitediarysettingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    where?: sitediarysettingsWhereInput
  }

  /**
   * Site without action
   */
  export type SiteDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
  }


  /**
   * Model Subscription
   */

  export type AggregateSubscription = {
    _count: SubscriptionCountAggregateOutputType | null
    _avg: SubscriptionAvgAggregateOutputType | null
    _sum: SubscriptionSumAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  export type SubscriptionAvgAggregateOutputType = {
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
  }

  export type SubscriptionSumAggregateOutputType = {
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
  }

  export type SubscriptionMinAggregateOutputType = {
    stripeSubscriptionId: string | null
    interval: string | null
    status: string | null
    planId: string | null
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
    createdAt: Date | null
    updatedAt: Date | null
    userId: string | null
  }

  export type SubscriptionMaxAggregateOutputType = {
    stripeSubscriptionId: string | null
    interval: string | null
    status: string | null
    planId: string | null
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
    createdAt: Date | null
    updatedAt: Date | null
    userId: string | null
  }

  export type SubscriptionCountAggregateOutputType = {
    stripeSubscriptionId: number
    interval: number
    status: number
    planId: number
    currentPeriodStart: number
    currentPeriodEnd: number
    createdAt: number
    updatedAt: number
    userId: number
    _all: number
  }


  export type SubscriptionAvgAggregateInputType = {
    currentPeriodStart?: true
    currentPeriodEnd?: true
  }

  export type SubscriptionSumAggregateInputType = {
    currentPeriodStart?: true
    currentPeriodEnd?: true
  }

  export type SubscriptionMinAggregateInputType = {
    stripeSubscriptionId?: true
    interval?: true
    status?: true
    planId?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    createdAt?: true
    updatedAt?: true
    userId?: true
  }

  export type SubscriptionMaxAggregateInputType = {
    stripeSubscriptionId?: true
    interval?: true
    status?: true
    planId?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    createdAt?: true
    updatedAt?: true
    userId?: true
  }

  export type SubscriptionCountAggregateInputType = {
    stripeSubscriptionId?: true
    interval?: true
    status?: true
    planId?: true
    currentPeriodStart?: true
    currentPeriodEnd?: true
    createdAt?: true
    updatedAt?: true
    userId?: true
    _all?: true
  }

  export type SubscriptionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscription to aggregate.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Subscriptions
    **/
    _count?: true | SubscriptionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubscriptionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubscriptionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubscriptionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubscriptionMaxAggregateInputType
  }

  export type GetSubscriptionAggregateType<T extends SubscriptionAggregateArgs> = {
        [P in keyof T & keyof AggregateSubscription]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubscription[P]>
      : GetScalarType<T[P], AggregateSubscription[P]>
  }




  export type SubscriptionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubscriptionWhereInput
    orderBy?: SubscriptionOrderByWithAggregationInput | SubscriptionOrderByWithAggregationInput[]
    by: SubscriptionScalarFieldEnum[] | SubscriptionScalarFieldEnum
    having?: SubscriptionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubscriptionCountAggregateInputType | true
    _avg?: SubscriptionAvgAggregateInputType
    _sum?: SubscriptionSumAggregateInputType
    _min?: SubscriptionMinAggregateInputType
    _max?: SubscriptionMaxAggregateInputType
  }

  export type SubscriptionGroupByOutputType = {
    stripeSubscriptionId: string
    interval: string
    status: string
    planId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    createdAt: Date
    updatedAt: Date
    userId: string | null
    _count: SubscriptionCountAggregateOutputType | null
    _avg: SubscriptionAvgAggregateOutputType | null
    _sum: SubscriptionSumAggregateOutputType | null
    _min: SubscriptionMinAggregateOutputType | null
    _max: SubscriptionMaxAggregateOutputType | null
  }

  type GetSubscriptionGroupByPayload<T extends SubscriptionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubscriptionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubscriptionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
            : GetScalarType<T[P], SubscriptionGroupByOutputType[P]>
        }
      >
    >


  export type SubscriptionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    stripeSubscriptionId?: boolean
    interval?: boolean
    status?: boolean
    planId?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
    User?: boolean | Subscription$UserArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    stripeSubscriptionId?: boolean
    interval?: boolean
    status?: boolean
    planId?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
    User?: boolean | Subscription$UserArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    stripeSubscriptionId?: boolean
    interval?: boolean
    status?: boolean
    planId?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
    User?: boolean | Subscription$UserArgs<ExtArgs>
  }, ExtArgs["result"]["subscription"]>

  export type SubscriptionSelectScalar = {
    stripeSubscriptionId?: boolean
    interval?: boolean
    status?: boolean
    planId?: boolean
    currentPeriodStart?: boolean
    currentPeriodEnd?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
  }

  export type SubscriptionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"stripeSubscriptionId" | "interval" | "status" | "planId" | "currentPeriodStart" | "currentPeriodEnd" | "createdAt" | "updatedAt" | "userId", ExtArgs["result"]["subscription"]>
  export type SubscriptionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Subscription$UserArgs<ExtArgs>
  }
  export type SubscriptionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Subscription$UserArgs<ExtArgs>
  }
  export type SubscriptionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Subscription$UserArgs<ExtArgs>
  }

  export type $SubscriptionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Subscription"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      stripeSubscriptionId: string
      interval: string
      status: string
      planId: string
      currentPeriodStart: number
      currentPeriodEnd: number
      createdAt: Date
      updatedAt: Date
      userId: string | null
    }, ExtArgs["result"]["subscription"]>
    composites: {}
  }

  type SubscriptionGetPayload<S extends boolean | null | undefined | SubscriptionDefaultArgs> = $Result.GetResult<Prisma.$SubscriptionPayload, S>

  type SubscriptionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SubscriptionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubscriptionCountAggregateInputType | true
    }

  export interface SubscriptionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Subscription'], meta: { name: 'Subscription' } }
    /**
     * Find zero or one Subscription that matches the filter.
     * @param {SubscriptionFindUniqueArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubscriptionFindUniqueArgs>(args: SelectSubset<T, SubscriptionFindUniqueArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Subscription that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubscriptionFindUniqueOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubscriptionFindUniqueOrThrowArgs>(args: SelectSubset<T, SubscriptionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubscriptionFindFirstArgs>(args?: SelectSubset<T, SubscriptionFindFirstArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Subscription that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindFirstOrThrowArgs} args - Arguments to find a Subscription
     * @example
     * // Get one Subscription
     * const subscription = await prisma.subscription.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubscriptionFindFirstOrThrowArgs>(args?: SelectSubset<T, SubscriptionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Subscriptions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Subscriptions
     * const subscriptions = await prisma.subscription.findMany()
     * 
     * // Get first 10 Subscriptions
     * const subscriptions = await prisma.subscription.findMany({ take: 10 })
     * 
     * // Only select the `stripeSubscriptionId`
     * const subscriptionWithStripeSubscriptionIdOnly = await prisma.subscription.findMany({ select: { stripeSubscriptionId: true } })
     * 
     */
    findMany<T extends SubscriptionFindManyArgs>(args?: SelectSubset<T, SubscriptionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Subscription.
     * @param {SubscriptionCreateArgs} args - Arguments to create a Subscription.
     * @example
     * // Create one Subscription
     * const Subscription = await prisma.subscription.create({
     *   data: {
     *     // ... data to create a Subscription
     *   }
     * })
     * 
     */
    create<T extends SubscriptionCreateArgs>(args: SelectSubset<T, SubscriptionCreateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Subscriptions.
     * @param {SubscriptionCreateManyArgs} args - Arguments to create many Subscriptions.
     * @example
     * // Create many Subscriptions
     * const subscription = await prisma.subscription.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubscriptionCreateManyArgs>(args?: SelectSubset<T, SubscriptionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Subscriptions and returns the data saved in the database.
     * @param {SubscriptionCreateManyAndReturnArgs} args - Arguments to create many Subscriptions.
     * @example
     * // Create many Subscriptions
     * const subscription = await prisma.subscription.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Subscriptions and only return the `stripeSubscriptionId`
     * const subscriptionWithStripeSubscriptionIdOnly = await prisma.subscription.createManyAndReturn({
     *   select: { stripeSubscriptionId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubscriptionCreateManyAndReturnArgs>(args?: SelectSubset<T, SubscriptionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Subscription.
     * @param {SubscriptionDeleteArgs} args - Arguments to delete one Subscription.
     * @example
     * // Delete one Subscription
     * const Subscription = await prisma.subscription.delete({
     *   where: {
     *     // ... filter to delete one Subscription
     *   }
     * })
     * 
     */
    delete<T extends SubscriptionDeleteArgs>(args: SelectSubset<T, SubscriptionDeleteArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Subscription.
     * @param {SubscriptionUpdateArgs} args - Arguments to update one Subscription.
     * @example
     * // Update one Subscription
     * const subscription = await prisma.subscription.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubscriptionUpdateArgs>(args: SelectSubset<T, SubscriptionUpdateArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Subscriptions.
     * @param {SubscriptionDeleteManyArgs} args - Arguments to filter Subscriptions to delete.
     * @example
     * // Delete a few Subscriptions
     * const { count } = await prisma.subscription.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubscriptionDeleteManyArgs>(args?: SelectSubset<T, SubscriptionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Subscriptions
     * const subscription = await prisma.subscription.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubscriptionUpdateManyArgs>(args: SelectSubset<T, SubscriptionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Subscriptions and returns the data updated in the database.
     * @param {SubscriptionUpdateManyAndReturnArgs} args - Arguments to update many Subscriptions.
     * @example
     * // Update many Subscriptions
     * const subscription = await prisma.subscription.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Subscriptions and only return the `stripeSubscriptionId`
     * const subscriptionWithStripeSubscriptionIdOnly = await prisma.subscription.updateManyAndReturn({
     *   select: { stripeSubscriptionId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SubscriptionUpdateManyAndReturnArgs>(args: SelectSubset<T, SubscriptionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Subscription.
     * @param {SubscriptionUpsertArgs} args - Arguments to update or create a Subscription.
     * @example
     * // Update or create a Subscription
     * const subscription = await prisma.subscription.upsert({
     *   create: {
     *     // ... data to create a Subscription
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Subscription we want to update
     *   }
     * })
     */
    upsert<T extends SubscriptionUpsertArgs>(args: SelectSubset<T, SubscriptionUpsertArgs<ExtArgs>>): Prisma__SubscriptionClient<$Result.GetResult<Prisma.$SubscriptionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Subscriptions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionCountArgs} args - Arguments to filter Subscriptions to count.
     * @example
     * // Count the number of Subscriptions
     * const count = await prisma.subscription.count({
     *   where: {
     *     // ... the filter for the Subscriptions we want to count
     *   }
     * })
    **/
    count<T extends SubscriptionCountArgs>(
      args?: Subset<T, SubscriptionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubscriptionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubscriptionAggregateArgs>(args: Subset<T, SubscriptionAggregateArgs>): Prisma.PrismaPromise<GetSubscriptionAggregateType<T>>

    /**
     * Group by Subscription.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubscriptionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubscriptionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubscriptionGroupByArgs['orderBy'] }
        : { orderBy?: SubscriptionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubscriptionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubscriptionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Subscription model
   */
  readonly fields: SubscriptionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Subscription.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubscriptionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends Subscription$UserArgs<ExtArgs> = {}>(args?: Subset<T, Subscription$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Subscription model
   */
  interface SubscriptionFieldRefs {
    readonly stripeSubscriptionId: FieldRef<"Subscription", 'String'>
    readonly interval: FieldRef<"Subscription", 'String'>
    readonly status: FieldRef<"Subscription", 'String'>
    readonly planId: FieldRef<"Subscription", 'String'>
    readonly currentPeriodStart: FieldRef<"Subscription", 'Int'>
    readonly currentPeriodEnd: FieldRef<"Subscription", 'Int'>
    readonly createdAt: FieldRef<"Subscription", 'DateTime'>
    readonly updatedAt: FieldRef<"Subscription", 'DateTime'>
    readonly userId: FieldRef<"Subscription", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Subscription findUnique
   */
  export type SubscriptionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findUniqueOrThrow
   */
  export type SubscriptionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription findFirst
   */
  export type SubscriptionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findFirstOrThrow
   */
  export type SubscriptionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscription to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Subscriptions.
     */
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription findMany
   */
  export type SubscriptionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter, which Subscriptions to fetch.
     */
    where?: SubscriptionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Subscriptions to fetch.
     */
    orderBy?: SubscriptionOrderByWithRelationInput | SubscriptionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Subscriptions.
     */
    cursor?: SubscriptionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Subscriptions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Subscriptions.
     */
    skip?: number
    distinct?: SubscriptionScalarFieldEnum | SubscriptionScalarFieldEnum[]
  }

  /**
   * Subscription create
   */
  export type SubscriptionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to create a Subscription.
     */
    data: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
  }

  /**
   * Subscription createMany
   */
  export type SubscriptionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Subscriptions.
     */
    data: SubscriptionCreateManyInput | SubscriptionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Subscription createManyAndReturn
   */
  export type SubscriptionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * The data used to create many Subscriptions.
     */
    data: SubscriptionCreateManyInput | SubscriptionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Subscription update
   */
  export type SubscriptionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The data needed to update a Subscription.
     */
    data: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
    /**
     * Choose, which Subscription to update.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription updateMany
   */
  export type SubscriptionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Subscriptions.
     */
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which Subscriptions to update
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to update.
     */
    limit?: number
  }

  /**
   * Subscription updateManyAndReturn
   */
  export type SubscriptionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * The data used to update Subscriptions.
     */
    data: XOR<SubscriptionUpdateManyMutationInput, SubscriptionUncheckedUpdateManyInput>
    /**
     * Filter which Subscriptions to update
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Subscription upsert
   */
  export type SubscriptionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * The filter to search for the Subscription to update in case it exists.
     */
    where: SubscriptionWhereUniqueInput
    /**
     * In case the Subscription found by the `where` argument doesn't exist, create a new Subscription with this data.
     */
    create: XOR<SubscriptionCreateInput, SubscriptionUncheckedCreateInput>
    /**
     * In case the Subscription was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubscriptionUpdateInput, SubscriptionUncheckedUpdateInput>
  }

  /**
   * Subscription delete
   */
  export type SubscriptionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
    /**
     * Filter which Subscription to delete.
     */
    where: SubscriptionWhereUniqueInput
  }

  /**
   * Subscription deleteMany
   */
  export type SubscriptionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Subscriptions to delete
     */
    where?: SubscriptionWhereInput
    /**
     * Limit how many Subscriptions to delete.
     */
    limit?: number
  }

  /**
   * Subscription.User
   */
  export type Subscription$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Subscription without action
   */
  export type SubscriptionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Subscription
     */
    select?: SubscriptionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Subscription
     */
    omit?: SubscriptionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubscriptionInclude<ExtArgs> | null
  }


  /**
   * Model Invoices
   */

  export type AggregateInvoices = {
    _count: InvoicesCountAggregateOutputType | null
    _avg: InvoicesAvgAggregateOutputType | null
    _sum: InvoicesSumAggregateOutputType | null
    _min: InvoicesMinAggregateOutputType | null
    _max: InvoicesMaxAggregateOutputType | null
  }

  export type InvoicesAvgAggregateOutputType = {
    invoiceTotalSumNoVat: number | null
    invoiceTotalSumWithVat: number | null
  }

  export type InvoicesSumAggregateOutputType = {
    invoiceTotalSumNoVat: number | null
    invoiceTotalSumWithVat: number | null
  }

  export type InvoicesMinAggregateOutputType = {
    id: string | null
    url: string | null
    invoiceNumber: string | null
    sellerName: string | null
    invoiceTotalSumNoVat: number | null
    invoiceTotalSumWithVat: number | null
    buyerName: string | null
    invoiceDate: string | null
    paymentDate: string | null
    isInvoice: boolean | null
    isCreditDebitProformaOrAdvanced: string | null
    uploadedAt: Date | null
    userId: string | null
    SiteId: string | null
  }

  export type InvoicesMaxAggregateOutputType = {
    id: string | null
    url: string | null
    invoiceNumber: string | null
    sellerName: string | null
    invoiceTotalSumNoVat: number | null
    invoiceTotalSumWithVat: number | null
    buyerName: string | null
    invoiceDate: string | null
    paymentDate: string | null
    isInvoice: boolean | null
    isCreditDebitProformaOrAdvanced: string | null
    uploadedAt: Date | null
    userId: string | null
    SiteId: string | null
  }

  export type InvoicesCountAggregateOutputType = {
    id: number
    url: number
    invoiceNumber: number
    sellerName: number
    invoiceTotalSumNoVat: number
    invoiceTotalSumWithVat: number
    buyerName: number
    invoiceDate: number
    paymentDate: number
    isInvoice: number
    isCreditDebitProformaOrAdvanced: number
    uploadedAt: number
    userId: number
    SiteId: number
    _all: number
  }


  export type InvoicesAvgAggregateInputType = {
    invoiceTotalSumNoVat?: true
    invoiceTotalSumWithVat?: true
  }

  export type InvoicesSumAggregateInputType = {
    invoiceTotalSumNoVat?: true
    invoiceTotalSumWithVat?: true
  }

  export type InvoicesMinAggregateInputType = {
    id?: true
    url?: true
    invoiceNumber?: true
    sellerName?: true
    invoiceTotalSumNoVat?: true
    invoiceTotalSumWithVat?: true
    buyerName?: true
    invoiceDate?: true
    paymentDate?: true
    isInvoice?: true
    isCreditDebitProformaOrAdvanced?: true
    uploadedAt?: true
    userId?: true
    SiteId?: true
  }

  export type InvoicesMaxAggregateInputType = {
    id?: true
    url?: true
    invoiceNumber?: true
    sellerName?: true
    invoiceTotalSumNoVat?: true
    invoiceTotalSumWithVat?: true
    buyerName?: true
    invoiceDate?: true
    paymentDate?: true
    isInvoice?: true
    isCreditDebitProformaOrAdvanced?: true
    uploadedAt?: true
    userId?: true
    SiteId?: true
  }

  export type InvoicesCountAggregateInputType = {
    id?: true
    url?: true
    invoiceNumber?: true
    sellerName?: true
    invoiceTotalSumNoVat?: true
    invoiceTotalSumWithVat?: true
    buyerName?: true
    invoiceDate?: true
    paymentDate?: true
    isInvoice?: true
    isCreditDebitProformaOrAdvanced?: true
    uploadedAt?: true
    userId?: true
    SiteId?: true
    _all?: true
  }

  export type InvoicesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Invoices to aggregate.
     */
    where?: InvoicesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Invoices to fetch.
     */
    orderBy?: InvoicesOrderByWithRelationInput | InvoicesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InvoicesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Invoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Invoices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Invoices
    **/
    _count?: true | InvoicesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InvoicesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InvoicesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InvoicesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InvoicesMaxAggregateInputType
  }

  export type GetInvoicesAggregateType<T extends InvoicesAggregateArgs> = {
        [P in keyof T & keyof AggregateInvoices]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInvoices[P]>
      : GetScalarType<T[P], AggregateInvoices[P]>
  }




  export type InvoicesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InvoicesWhereInput
    orderBy?: InvoicesOrderByWithAggregationInput | InvoicesOrderByWithAggregationInput[]
    by: InvoicesScalarFieldEnum[] | InvoicesScalarFieldEnum
    having?: InvoicesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InvoicesCountAggregateInputType | true
    _avg?: InvoicesAvgAggregateInputType
    _sum?: InvoicesSumAggregateInputType
    _min?: InvoicesMinAggregateInputType
    _max?: InvoicesMaxAggregateInputType
  }

  export type InvoicesGroupByOutputType = {
    id: string
    url: string
    invoiceNumber: string | null
    sellerName: string | null
    invoiceTotalSumNoVat: number | null
    invoiceTotalSumWithVat: number | null
    buyerName: string | null
    invoiceDate: string | null
    paymentDate: string | null
    isInvoice: boolean | null
    isCreditDebitProformaOrAdvanced: string | null
    uploadedAt: Date
    userId: string | null
    SiteId: string | null
    _count: InvoicesCountAggregateOutputType | null
    _avg: InvoicesAvgAggregateOutputType | null
    _sum: InvoicesSumAggregateOutputType | null
    _min: InvoicesMinAggregateOutputType | null
    _max: InvoicesMaxAggregateOutputType | null
  }

  type GetInvoicesGroupByPayload<T extends InvoicesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InvoicesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InvoicesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InvoicesGroupByOutputType[P]>
            : GetScalarType<T[P], InvoicesGroupByOutputType[P]>
        }
      >
    >


  export type InvoicesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceTotalSumNoVat?: boolean
    invoiceTotalSumWithVat?: boolean
    buyerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
    isInvoice?: boolean
    isCreditDebitProformaOrAdvanced?: boolean
    uploadedAt?: boolean
    userId?: boolean
    SiteId?: boolean
    User?: boolean | Invoices$UserArgs<ExtArgs>
    Site?: boolean | Invoices$SiteArgs<ExtArgs>
    items?: boolean | Invoices$itemsArgs<ExtArgs>
    _count?: boolean | InvoicesCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["invoices"]>

  export type InvoicesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceTotalSumNoVat?: boolean
    invoiceTotalSumWithVat?: boolean
    buyerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
    isInvoice?: boolean
    isCreditDebitProformaOrAdvanced?: boolean
    uploadedAt?: boolean
    userId?: boolean
    SiteId?: boolean
    User?: boolean | Invoices$UserArgs<ExtArgs>
    Site?: boolean | Invoices$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["invoices"]>

  export type InvoicesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceTotalSumNoVat?: boolean
    invoiceTotalSumWithVat?: boolean
    buyerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
    isInvoice?: boolean
    isCreditDebitProformaOrAdvanced?: boolean
    uploadedAt?: boolean
    userId?: boolean
    SiteId?: boolean
    User?: boolean | Invoices$UserArgs<ExtArgs>
    Site?: boolean | Invoices$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["invoices"]>

  export type InvoicesSelectScalar = {
    id?: boolean
    url?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceTotalSumNoVat?: boolean
    invoiceTotalSumWithVat?: boolean
    buyerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
    isInvoice?: boolean
    isCreditDebitProformaOrAdvanced?: boolean
    uploadedAt?: boolean
    userId?: boolean
    SiteId?: boolean
  }

  export type InvoicesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "url" | "invoiceNumber" | "sellerName" | "invoiceTotalSumNoVat" | "invoiceTotalSumWithVat" | "buyerName" | "invoiceDate" | "paymentDate" | "isInvoice" | "isCreditDebitProformaOrAdvanced" | "uploadedAt" | "userId" | "SiteId", ExtArgs["result"]["invoices"]>
  export type InvoicesInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Invoices$UserArgs<ExtArgs>
    Site?: boolean | Invoices$SiteArgs<ExtArgs>
    items?: boolean | Invoices$itemsArgs<ExtArgs>
    _count?: boolean | InvoicesCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type InvoicesIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Invoices$UserArgs<ExtArgs>
    Site?: boolean | Invoices$SiteArgs<ExtArgs>
  }
  export type InvoicesIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Invoices$UserArgs<ExtArgs>
    Site?: boolean | Invoices$SiteArgs<ExtArgs>
  }

  export type $InvoicesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Invoices"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
      Site: Prisma.$SitePayload<ExtArgs> | null
      items: Prisma.$InvoiceItemsPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      url: string
      invoiceNumber: string | null
      sellerName: string | null
      invoiceTotalSumNoVat: number | null
      invoiceTotalSumWithVat: number | null
      buyerName: string | null
      invoiceDate: string | null
      paymentDate: string | null
      isInvoice: boolean | null
      isCreditDebitProformaOrAdvanced: string | null
      uploadedAt: Date
      userId: string | null
      SiteId: string | null
    }, ExtArgs["result"]["invoices"]>
    composites: {}
  }

  type InvoicesGetPayload<S extends boolean | null | undefined | InvoicesDefaultArgs> = $Result.GetResult<Prisma.$InvoicesPayload, S>

  type InvoicesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InvoicesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InvoicesCountAggregateInputType | true
    }

  export interface InvoicesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Invoices'], meta: { name: 'Invoices' } }
    /**
     * Find zero or one Invoices that matches the filter.
     * @param {InvoicesFindUniqueArgs} args - Arguments to find a Invoices
     * @example
     * // Get one Invoices
     * const invoices = await prisma.invoices.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InvoicesFindUniqueArgs>(args: SelectSubset<T, InvoicesFindUniqueArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Invoices that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InvoicesFindUniqueOrThrowArgs} args - Arguments to find a Invoices
     * @example
     * // Get one Invoices
     * const invoices = await prisma.invoices.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InvoicesFindUniqueOrThrowArgs>(args: SelectSubset<T, InvoicesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Invoices that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoicesFindFirstArgs} args - Arguments to find a Invoices
     * @example
     * // Get one Invoices
     * const invoices = await prisma.invoices.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InvoicesFindFirstArgs>(args?: SelectSubset<T, InvoicesFindFirstArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Invoices that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoicesFindFirstOrThrowArgs} args - Arguments to find a Invoices
     * @example
     * // Get one Invoices
     * const invoices = await prisma.invoices.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InvoicesFindFirstOrThrowArgs>(args?: SelectSubset<T, InvoicesFindFirstOrThrowArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Invoices that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoicesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Invoices
     * const invoices = await prisma.invoices.findMany()
     * 
     * // Get first 10 Invoices
     * const invoices = await prisma.invoices.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const invoicesWithIdOnly = await prisma.invoices.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InvoicesFindManyArgs>(args?: SelectSubset<T, InvoicesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Invoices.
     * @param {InvoicesCreateArgs} args - Arguments to create a Invoices.
     * @example
     * // Create one Invoices
     * const Invoices = await prisma.invoices.create({
     *   data: {
     *     // ... data to create a Invoices
     *   }
     * })
     * 
     */
    create<T extends InvoicesCreateArgs>(args: SelectSubset<T, InvoicesCreateArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Invoices.
     * @param {InvoicesCreateManyArgs} args - Arguments to create many Invoices.
     * @example
     * // Create many Invoices
     * const invoices = await prisma.invoices.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InvoicesCreateManyArgs>(args?: SelectSubset<T, InvoicesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Invoices and returns the data saved in the database.
     * @param {InvoicesCreateManyAndReturnArgs} args - Arguments to create many Invoices.
     * @example
     * // Create many Invoices
     * const invoices = await prisma.invoices.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Invoices and only return the `id`
     * const invoicesWithIdOnly = await prisma.invoices.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InvoicesCreateManyAndReturnArgs>(args?: SelectSubset<T, InvoicesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Invoices.
     * @param {InvoicesDeleteArgs} args - Arguments to delete one Invoices.
     * @example
     * // Delete one Invoices
     * const Invoices = await prisma.invoices.delete({
     *   where: {
     *     // ... filter to delete one Invoices
     *   }
     * })
     * 
     */
    delete<T extends InvoicesDeleteArgs>(args: SelectSubset<T, InvoicesDeleteArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Invoices.
     * @param {InvoicesUpdateArgs} args - Arguments to update one Invoices.
     * @example
     * // Update one Invoices
     * const invoices = await prisma.invoices.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InvoicesUpdateArgs>(args: SelectSubset<T, InvoicesUpdateArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Invoices.
     * @param {InvoicesDeleteManyArgs} args - Arguments to filter Invoices to delete.
     * @example
     * // Delete a few Invoices
     * const { count } = await prisma.invoices.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InvoicesDeleteManyArgs>(args?: SelectSubset<T, InvoicesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Invoices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoicesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Invoices
     * const invoices = await prisma.invoices.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InvoicesUpdateManyArgs>(args: SelectSubset<T, InvoicesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Invoices and returns the data updated in the database.
     * @param {InvoicesUpdateManyAndReturnArgs} args - Arguments to update many Invoices.
     * @example
     * // Update many Invoices
     * const invoices = await prisma.invoices.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Invoices and only return the `id`
     * const invoicesWithIdOnly = await prisma.invoices.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InvoicesUpdateManyAndReturnArgs>(args: SelectSubset<T, InvoicesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Invoices.
     * @param {InvoicesUpsertArgs} args - Arguments to update or create a Invoices.
     * @example
     * // Update or create a Invoices
     * const invoices = await prisma.invoices.upsert({
     *   create: {
     *     // ... data to create a Invoices
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Invoices we want to update
     *   }
     * })
     */
    upsert<T extends InvoicesUpsertArgs>(args: SelectSubset<T, InvoicesUpsertArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Invoices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoicesCountArgs} args - Arguments to filter Invoices to count.
     * @example
     * // Count the number of Invoices
     * const count = await prisma.invoices.count({
     *   where: {
     *     // ... the filter for the Invoices we want to count
     *   }
     * })
    **/
    count<T extends InvoicesCountArgs>(
      args?: Subset<T, InvoicesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InvoicesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Invoices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoicesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InvoicesAggregateArgs>(args: Subset<T, InvoicesAggregateArgs>): Prisma.PrismaPromise<GetInvoicesAggregateType<T>>

    /**
     * Group by Invoices.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoicesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InvoicesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InvoicesGroupByArgs['orderBy'] }
        : { orderBy?: InvoicesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InvoicesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInvoicesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Invoices model
   */
  readonly fields: InvoicesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Invoices.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InvoicesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends Invoices$UserArgs<ExtArgs> = {}>(args?: Subset<T, Invoices$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    Site<T extends Invoices$SiteArgs<ExtArgs> = {}>(args?: Subset<T, Invoices$SiteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    items<T extends Invoices$itemsArgs<ExtArgs> = {}>(args?: Subset<T, Invoices$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Invoices model
   */
  interface InvoicesFieldRefs {
    readonly id: FieldRef<"Invoices", 'String'>
    readonly url: FieldRef<"Invoices", 'String'>
    readonly invoiceNumber: FieldRef<"Invoices", 'String'>
    readonly sellerName: FieldRef<"Invoices", 'String'>
    readonly invoiceTotalSumNoVat: FieldRef<"Invoices", 'Float'>
    readonly invoiceTotalSumWithVat: FieldRef<"Invoices", 'Float'>
    readonly buyerName: FieldRef<"Invoices", 'String'>
    readonly invoiceDate: FieldRef<"Invoices", 'String'>
    readonly paymentDate: FieldRef<"Invoices", 'String'>
    readonly isInvoice: FieldRef<"Invoices", 'Boolean'>
    readonly isCreditDebitProformaOrAdvanced: FieldRef<"Invoices", 'String'>
    readonly uploadedAt: FieldRef<"Invoices", 'DateTime'>
    readonly userId: FieldRef<"Invoices", 'String'>
    readonly SiteId: FieldRef<"Invoices", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Invoices findUnique
   */
  export type InvoicesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * Filter, which Invoices to fetch.
     */
    where: InvoicesWhereUniqueInput
  }

  /**
   * Invoices findUniqueOrThrow
   */
  export type InvoicesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * Filter, which Invoices to fetch.
     */
    where: InvoicesWhereUniqueInput
  }

  /**
   * Invoices findFirst
   */
  export type InvoicesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * Filter, which Invoices to fetch.
     */
    where?: InvoicesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Invoices to fetch.
     */
    orderBy?: InvoicesOrderByWithRelationInput | InvoicesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Invoices.
     */
    cursor?: InvoicesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Invoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Invoices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Invoices.
     */
    distinct?: InvoicesScalarFieldEnum | InvoicesScalarFieldEnum[]
  }

  /**
   * Invoices findFirstOrThrow
   */
  export type InvoicesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * Filter, which Invoices to fetch.
     */
    where?: InvoicesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Invoices to fetch.
     */
    orderBy?: InvoicesOrderByWithRelationInput | InvoicesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Invoices.
     */
    cursor?: InvoicesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Invoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Invoices.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Invoices.
     */
    distinct?: InvoicesScalarFieldEnum | InvoicesScalarFieldEnum[]
  }

  /**
   * Invoices findMany
   */
  export type InvoicesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * Filter, which Invoices to fetch.
     */
    where?: InvoicesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Invoices to fetch.
     */
    orderBy?: InvoicesOrderByWithRelationInput | InvoicesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Invoices.
     */
    cursor?: InvoicesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Invoices from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Invoices.
     */
    skip?: number
    distinct?: InvoicesScalarFieldEnum | InvoicesScalarFieldEnum[]
  }

  /**
   * Invoices create
   */
  export type InvoicesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * The data needed to create a Invoices.
     */
    data: XOR<InvoicesCreateInput, InvoicesUncheckedCreateInput>
  }

  /**
   * Invoices createMany
   */
  export type InvoicesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Invoices.
     */
    data: InvoicesCreateManyInput | InvoicesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Invoices createManyAndReturn
   */
  export type InvoicesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * The data used to create many Invoices.
     */
    data: InvoicesCreateManyInput | InvoicesCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Invoices update
   */
  export type InvoicesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * The data needed to update a Invoices.
     */
    data: XOR<InvoicesUpdateInput, InvoicesUncheckedUpdateInput>
    /**
     * Choose, which Invoices to update.
     */
    where: InvoicesWhereUniqueInput
  }

  /**
   * Invoices updateMany
   */
  export type InvoicesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Invoices.
     */
    data: XOR<InvoicesUpdateManyMutationInput, InvoicesUncheckedUpdateManyInput>
    /**
     * Filter which Invoices to update
     */
    where?: InvoicesWhereInput
    /**
     * Limit how many Invoices to update.
     */
    limit?: number
  }

  /**
   * Invoices updateManyAndReturn
   */
  export type InvoicesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * The data used to update Invoices.
     */
    data: XOR<InvoicesUpdateManyMutationInput, InvoicesUncheckedUpdateManyInput>
    /**
     * Filter which Invoices to update
     */
    where?: InvoicesWhereInput
    /**
     * Limit how many Invoices to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Invoices upsert
   */
  export type InvoicesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * The filter to search for the Invoices to update in case it exists.
     */
    where: InvoicesWhereUniqueInput
    /**
     * In case the Invoices found by the `where` argument doesn't exist, create a new Invoices with this data.
     */
    create: XOR<InvoicesCreateInput, InvoicesUncheckedCreateInput>
    /**
     * In case the Invoices was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InvoicesUpdateInput, InvoicesUncheckedUpdateInput>
  }

  /**
   * Invoices delete
   */
  export type InvoicesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
    /**
     * Filter which Invoices to delete.
     */
    where: InvoicesWhereUniqueInput
  }

  /**
   * Invoices deleteMany
   */
  export type InvoicesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Invoices to delete
     */
    where?: InvoicesWhereInput
    /**
     * Limit how many Invoices to delete.
     */
    limit?: number
  }

  /**
   * Invoices.User
   */
  export type Invoices$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Invoices.Site
   */
  export type Invoices$SiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
  }

  /**
   * Invoices.items
   */
  export type Invoices$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    where?: InvoiceItemsWhereInput
    orderBy?: InvoiceItemsOrderByWithRelationInput | InvoiceItemsOrderByWithRelationInput[]
    cursor?: InvoiceItemsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: InvoiceItemsScalarFieldEnum | InvoiceItemsScalarFieldEnum[]
  }

  /**
   * Invoices without action
   */
  export type InvoicesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Invoices
     */
    select?: InvoicesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Invoices
     */
    omit?: InvoicesOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoicesInclude<ExtArgs> | null
  }


  /**
   * Model Post
   */

  export type AggregatePost = {
    _count: PostCountAggregateOutputType | null
    _min: PostMinAggregateOutputType | null
    _max: PostMaxAggregateOutputType | null
  }

  export type PostMinAggregateOutputType = {
    id: string | null
    title: string | null
    smallDescription: string | null
    image: string | null
    slug: string | null
    createdAt: Date | null
    updatedAt: Date | null
    userId: string | null
    siteId: string | null
  }

  export type PostMaxAggregateOutputType = {
    id: string | null
    title: string | null
    smallDescription: string | null
    image: string | null
    slug: string | null
    createdAt: Date | null
    updatedAt: Date | null
    userId: string | null
    siteId: string | null
  }

  export type PostCountAggregateOutputType = {
    id: number
    title: number
    articleContent: number
    smallDescription: number
    image: number
    slug: number
    createdAt: number
    updatedAt: number
    userId: number
    siteId: number
    _all: number
  }


  export type PostMinAggregateInputType = {
    id?: true
    title?: true
    smallDescription?: true
    image?: true
    slug?: true
    createdAt?: true
    updatedAt?: true
    userId?: true
    siteId?: true
  }

  export type PostMaxAggregateInputType = {
    id?: true
    title?: true
    smallDescription?: true
    image?: true
    slug?: true
    createdAt?: true
    updatedAt?: true
    userId?: true
    siteId?: true
  }

  export type PostCountAggregateInputType = {
    id?: true
    title?: true
    articleContent?: true
    smallDescription?: true
    image?: true
    slug?: true
    createdAt?: true
    updatedAt?: true
    userId?: true
    siteId?: true
    _all?: true
  }

  export type PostAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Post to aggregate.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Posts
    **/
    _count?: true | PostCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PostMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PostMaxAggregateInputType
  }

  export type GetPostAggregateType<T extends PostAggregateArgs> = {
        [P in keyof T & keyof AggregatePost]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePost[P]>
      : GetScalarType<T[P], AggregatePost[P]>
  }




  export type PostGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PostWhereInput
    orderBy?: PostOrderByWithAggregationInput | PostOrderByWithAggregationInput[]
    by: PostScalarFieldEnum[] | PostScalarFieldEnum
    having?: PostScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PostCountAggregateInputType | true
    _min?: PostMinAggregateInputType
    _max?: PostMaxAggregateInputType
  }

  export type PostGroupByOutputType = {
    id: string
    title: string
    articleContent: JsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt: Date
    updatedAt: Date
    userId: string | null
    siteId: string | null
    _count: PostCountAggregateOutputType | null
    _min: PostMinAggregateOutputType | null
    _max: PostMaxAggregateOutputType | null
  }

  type GetPostGroupByPayload<T extends PostGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PostGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PostGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PostGroupByOutputType[P]>
            : GetScalarType<T[P], PostGroupByOutputType[P]>
        }
      >
    >


  export type PostSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    articleContent?: boolean
    smallDescription?: boolean
    image?: boolean
    slug?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | Post$UserArgs<ExtArgs>
    Site?: boolean | Post$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["post"]>

  export type PostSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    articleContent?: boolean
    smallDescription?: boolean
    image?: boolean
    slug?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | Post$UserArgs<ExtArgs>
    Site?: boolean | Post$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["post"]>

  export type PostSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    articleContent?: boolean
    smallDescription?: boolean
    image?: boolean
    slug?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | Post$UserArgs<ExtArgs>
    Site?: boolean | Post$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["post"]>

  export type PostSelectScalar = {
    id?: boolean
    title?: boolean
    articleContent?: boolean
    smallDescription?: boolean
    image?: boolean
    slug?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    userId?: boolean
    siteId?: boolean
  }

  export type PostOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "articleContent" | "smallDescription" | "image" | "slug" | "createdAt" | "updatedAt" | "userId" | "siteId", ExtArgs["result"]["post"]>
  export type PostInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Post$UserArgs<ExtArgs>
    Site?: boolean | Post$SiteArgs<ExtArgs>
  }
  export type PostIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Post$UserArgs<ExtArgs>
    Site?: boolean | Post$SiteArgs<ExtArgs>
  }
  export type PostIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Post$UserArgs<ExtArgs>
    Site?: boolean | Post$SiteArgs<ExtArgs>
  }

  export type $PostPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Post"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
      Site: Prisma.$SitePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      articleContent: Prisma.JsonValue
      smallDescription: string
      image: string
      slug: string
      createdAt: Date
      updatedAt: Date
      userId: string | null
      siteId: string | null
    }, ExtArgs["result"]["post"]>
    composites: {}
  }

  type PostGetPayload<S extends boolean | null | undefined | PostDefaultArgs> = $Result.GetResult<Prisma.$PostPayload, S>

  type PostCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PostFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PostCountAggregateInputType | true
    }

  export interface PostDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Post'], meta: { name: 'Post' } }
    /**
     * Find zero or one Post that matches the filter.
     * @param {PostFindUniqueArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PostFindUniqueArgs>(args: SelectSubset<T, PostFindUniqueArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Post that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PostFindUniqueOrThrowArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PostFindUniqueOrThrowArgs>(args: SelectSubset<T, PostFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Post that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostFindFirstArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PostFindFirstArgs>(args?: SelectSubset<T, PostFindFirstArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Post that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostFindFirstOrThrowArgs} args - Arguments to find a Post
     * @example
     * // Get one Post
     * const post = await prisma.post.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PostFindFirstOrThrowArgs>(args?: SelectSubset<T, PostFindFirstOrThrowArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Posts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Posts
     * const posts = await prisma.post.findMany()
     * 
     * // Get first 10 Posts
     * const posts = await prisma.post.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const postWithIdOnly = await prisma.post.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PostFindManyArgs>(args?: SelectSubset<T, PostFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Post.
     * @param {PostCreateArgs} args - Arguments to create a Post.
     * @example
     * // Create one Post
     * const Post = await prisma.post.create({
     *   data: {
     *     // ... data to create a Post
     *   }
     * })
     * 
     */
    create<T extends PostCreateArgs>(args: SelectSubset<T, PostCreateArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Posts.
     * @param {PostCreateManyArgs} args - Arguments to create many Posts.
     * @example
     * // Create many Posts
     * const post = await prisma.post.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PostCreateManyArgs>(args?: SelectSubset<T, PostCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Posts and returns the data saved in the database.
     * @param {PostCreateManyAndReturnArgs} args - Arguments to create many Posts.
     * @example
     * // Create many Posts
     * const post = await prisma.post.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Posts and only return the `id`
     * const postWithIdOnly = await prisma.post.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PostCreateManyAndReturnArgs>(args?: SelectSubset<T, PostCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Post.
     * @param {PostDeleteArgs} args - Arguments to delete one Post.
     * @example
     * // Delete one Post
     * const Post = await prisma.post.delete({
     *   where: {
     *     // ... filter to delete one Post
     *   }
     * })
     * 
     */
    delete<T extends PostDeleteArgs>(args: SelectSubset<T, PostDeleteArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Post.
     * @param {PostUpdateArgs} args - Arguments to update one Post.
     * @example
     * // Update one Post
     * const post = await prisma.post.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PostUpdateArgs>(args: SelectSubset<T, PostUpdateArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Posts.
     * @param {PostDeleteManyArgs} args - Arguments to filter Posts to delete.
     * @example
     * // Delete a few Posts
     * const { count } = await prisma.post.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PostDeleteManyArgs>(args?: SelectSubset<T, PostDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Posts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Posts
     * const post = await prisma.post.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PostUpdateManyArgs>(args: SelectSubset<T, PostUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Posts and returns the data updated in the database.
     * @param {PostUpdateManyAndReturnArgs} args - Arguments to update many Posts.
     * @example
     * // Update many Posts
     * const post = await prisma.post.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Posts and only return the `id`
     * const postWithIdOnly = await prisma.post.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends PostUpdateManyAndReturnArgs>(args: SelectSubset<T, PostUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Post.
     * @param {PostUpsertArgs} args - Arguments to update or create a Post.
     * @example
     * // Update or create a Post
     * const post = await prisma.post.upsert({
     *   create: {
     *     // ... data to create a Post
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Post we want to update
     *   }
     * })
     */
    upsert<T extends PostUpsertArgs>(args: SelectSubset<T, PostUpsertArgs<ExtArgs>>): Prisma__PostClient<$Result.GetResult<Prisma.$PostPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Posts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostCountArgs} args - Arguments to filter Posts to count.
     * @example
     * // Count the number of Posts
     * const count = await prisma.post.count({
     *   where: {
     *     // ... the filter for the Posts we want to count
     *   }
     * })
    **/
    count<T extends PostCountArgs>(
      args?: Subset<T, PostCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PostCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Post.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PostAggregateArgs>(args: Subset<T, PostAggregateArgs>): Prisma.PrismaPromise<GetPostAggregateType<T>>

    /**
     * Group by Post.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PostGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PostGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PostGroupByArgs['orderBy'] }
        : { orderBy?: PostGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PostGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPostGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Post model
   */
  readonly fields: PostFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Post.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PostClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends Post$UserArgs<ExtArgs> = {}>(args?: Subset<T, Post$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    Site<T extends Post$SiteArgs<ExtArgs> = {}>(args?: Subset<T, Post$SiteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Post model
   */
  interface PostFieldRefs {
    readonly id: FieldRef<"Post", 'String'>
    readonly title: FieldRef<"Post", 'String'>
    readonly articleContent: FieldRef<"Post", 'Json'>
    readonly smallDescription: FieldRef<"Post", 'String'>
    readonly image: FieldRef<"Post", 'String'>
    readonly slug: FieldRef<"Post", 'String'>
    readonly createdAt: FieldRef<"Post", 'DateTime'>
    readonly updatedAt: FieldRef<"Post", 'DateTime'>
    readonly userId: FieldRef<"Post", 'String'>
    readonly siteId: FieldRef<"Post", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Post findUnique
   */
  export type PostFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post findUniqueOrThrow
   */
  export type PostFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post findFirst
   */
  export type PostFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Posts.
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Posts.
     */
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Post findFirstOrThrow
   */
  export type PostFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Post to fetch.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Posts.
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Posts.
     */
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Post findMany
   */
  export type PostFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter, which Posts to fetch.
     */
    where?: PostWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Posts to fetch.
     */
    orderBy?: PostOrderByWithRelationInput | PostOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Posts.
     */
    cursor?: PostWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Posts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Posts.
     */
    skip?: number
    distinct?: PostScalarFieldEnum | PostScalarFieldEnum[]
  }

  /**
   * Post create
   */
  export type PostCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * The data needed to create a Post.
     */
    data: XOR<PostCreateInput, PostUncheckedCreateInput>
  }

  /**
   * Post createMany
   */
  export type PostCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Posts.
     */
    data: PostCreateManyInput | PostCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Post createManyAndReturn
   */
  export type PostCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * The data used to create many Posts.
     */
    data: PostCreateManyInput | PostCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Post update
   */
  export type PostUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * The data needed to update a Post.
     */
    data: XOR<PostUpdateInput, PostUncheckedUpdateInput>
    /**
     * Choose, which Post to update.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post updateMany
   */
  export type PostUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Posts.
     */
    data: XOR<PostUpdateManyMutationInput, PostUncheckedUpdateManyInput>
    /**
     * Filter which Posts to update
     */
    where?: PostWhereInput
    /**
     * Limit how many Posts to update.
     */
    limit?: number
  }

  /**
   * Post updateManyAndReturn
   */
  export type PostUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * The data used to update Posts.
     */
    data: XOR<PostUpdateManyMutationInput, PostUncheckedUpdateManyInput>
    /**
     * Filter which Posts to update
     */
    where?: PostWhereInput
    /**
     * Limit how many Posts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Post upsert
   */
  export type PostUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * The filter to search for the Post to update in case it exists.
     */
    where: PostWhereUniqueInput
    /**
     * In case the Post found by the `where` argument doesn't exist, create a new Post with this data.
     */
    create: XOR<PostCreateInput, PostUncheckedCreateInput>
    /**
     * In case the Post was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PostUpdateInput, PostUncheckedUpdateInput>
  }

  /**
   * Post delete
   */
  export type PostDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
    /**
     * Filter which Post to delete.
     */
    where: PostWhereUniqueInput
  }

  /**
   * Post deleteMany
   */
  export type PostDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Posts to delete
     */
    where?: PostWhereInput
    /**
     * Limit how many Posts to delete.
     */
    limit?: number
  }

  /**
   * Post.User
   */
  export type Post$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Post.Site
   */
  export type Post$SiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
  }

  /**
   * Post without action
   */
  export type PostDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Post
     */
    select?: PostSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Post
     */
    omit?: PostOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PostInclude<ExtArgs> | null
  }


  /**
   * Model InvoiceItems
   */

  export type AggregateInvoiceItems = {
    _count: InvoiceItemsCountAggregateOutputType | null
    _avg: InvoiceItemsAvgAggregateOutputType | null
    _sum: InvoiceItemsSumAggregateOutputType | null
    _min: InvoiceItemsMinAggregateOutputType | null
    _max: InvoiceItemsMaxAggregateOutputType | null
  }

  export type InvoiceItemsAvgAggregateOutputType = {
    quantity: number | null
    pricePerUnitOfMeasure: number | null
    sum: number | null
  }

  export type InvoiceItemsSumAggregateOutputType = {
    quantity: number | null
    pricePerUnitOfMeasure: number | null
    sum: number | null
  }

  export type InvoiceItemsMinAggregateOutputType = {
    id: string | null
    item: string | null
    quantity: number | null
    unitOfMeasure: string | null
    pricePerUnitOfMeasure: number | null
    sum: number | null
    currency: string | null
    category: string | null
    itemDescription: string | null
    commentsForUser: string | null
    isInvoice: boolean | null
    invoiceId: string | null
    siteId: string | null
    invoiceNumber: string | null
    sellerName: string | null
    invoiceDate: string | null
    paymentDate: string | null
  }

  export type InvoiceItemsMaxAggregateOutputType = {
    id: string | null
    item: string | null
    quantity: number | null
    unitOfMeasure: string | null
    pricePerUnitOfMeasure: number | null
    sum: number | null
    currency: string | null
    category: string | null
    itemDescription: string | null
    commentsForUser: string | null
    isInvoice: boolean | null
    invoiceId: string | null
    siteId: string | null
    invoiceNumber: string | null
    sellerName: string | null
    invoiceDate: string | null
    paymentDate: string | null
  }

  export type InvoiceItemsCountAggregateOutputType = {
    id: number
    item: number
    quantity: number
    unitOfMeasure: number
    pricePerUnitOfMeasure: number
    sum: number
    currency: number
    category: number
    itemDescription: number
    commentsForUser: number
    isInvoice: number
    invoiceId: number
    siteId: number
    invoiceNumber: number
    sellerName: number
    invoiceDate: number
    paymentDate: number
    _all: number
  }


  export type InvoiceItemsAvgAggregateInputType = {
    quantity?: true
    pricePerUnitOfMeasure?: true
    sum?: true
  }

  export type InvoiceItemsSumAggregateInputType = {
    quantity?: true
    pricePerUnitOfMeasure?: true
    sum?: true
  }

  export type InvoiceItemsMinAggregateInputType = {
    id?: true
    item?: true
    quantity?: true
    unitOfMeasure?: true
    pricePerUnitOfMeasure?: true
    sum?: true
    currency?: true
    category?: true
    itemDescription?: true
    commentsForUser?: true
    isInvoice?: true
    invoiceId?: true
    siteId?: true
    invoiceNumber?: true
    sellerName?: true
    invoiceDate?: true
    paymentDate?: true
  }

  export type InvoiceItemsMaxAggregateInputType = {
    id?: true
    item?: true
    quantity?: true
    unitOfMeasure?: true
    pricePerUnitOfMeasure?: true
    sum?: true
    currency?: true
    category?: true
    itemDescription?: true
    commentsForUser?: true
    isInvoice?: true
    invoiceId?: true
    siteId?: true
    invoiceNumber?: true
    sellerName?: true
    invoiceDate?: true
    paymentDate?: true
  }

  export type InvoiceItemsCountAggregateInputType = {
    id?: true
    item?: true
    quantity?: true
    unitOfMeasure?: true
    pricePerUnitOfMeasure?: true
    sum?: true
    currency?: true
    category?: true
    itemDescription?: true
    commentsForUser?: true
    isInvoice?: true
    invoiceId?: true
    siteId?: true
    invoiceNumber?: true
    sellerName?: true
    invoiceDate?: true
    paymentDate?: true
    _all?: true
  }

  export type InvoiceItemsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InvoiceItems to aggregate.
     */
    where?: InvoiceItemsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvoiceItems to fetch.
     */
    orderBy?: InvoiceItemsOrderByWithRelationInput | InvoiceItemsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: InvoiceItemsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvoiceItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvoiceItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned InvoiceItems
    **/
    _count?: true | InvoiceItemsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: InvoiceItemsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: InvoiceItemsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: InvoiceItemsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: InvoiceItemsMaxAggregateInputType
  }

  export type GetInvoiceItemsAggregateType<T extends InvoiceItemsAggregateArgs> = {
        [P in keyof T & keyof AggregateInvoiceItems]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateInvoiceItems[P]>
      : GetScalarType<T[P], AggregateInvoiceItems[P]>
  }




  export type InvoiceItemsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: InvoiceItemsWhereInput
    orderBy?: InvoiceItemsOrderByWithAggregationInput | InvoiceItemsOrderByWithAggregationInput[]
    by: InvoiceItemsScalarFieldEnum[] | InvoiceItemsScalarFieldEnum
    having?: InvoiceItemsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: InvoiceItemsCountAggregateInputType | true
    _avg?: InvoiceItemsAvgAggregateInputType
    _sum?: InvoiceItemsSumAggregateInputType
    _min?: InvoiceItemsMinAggregateInputType
    _max?: InvoiceItemsMaxAggregateInputType
  }

  export type InvoiceItemsGroupByOutputType = {
    id: string
    item: string | null
    quantity: number | null
    unitOfMeasure: string | null
    pricePerUnitOfMeasure: number | null
    sum: number | null
    currency: string | null
    category: string | null
    itemDescription: string | null
    commentsForUser: string | null
    isInvoice: boolean | null
    invoiceId: string
    siteId: string | null
    invoiceNumber: string | null
    sellerName: string | null
    invoiceDate: string | null
    paymentDate: string | null
    _count: InvoiceItemsCountAggregateOutputType | null
    _avg: InvoiceItemsAvgAggregateOutputType | null
    _sum: InvoiceItemsSumAggregateOutputType | null
    _min: InvoiceItemsMinAggregateOutputType | null
    _max: InvoiceItemsMaxAggregateOutputType | null
  }

  type GetInvoiceItemsGroupByPayload<T extends InvoiceItemsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<InvoiceItemsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof InvoiceItemsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], InvoiceItemsGroupByOutputType[P]>
            : GetScalarType<T[P], InvoiceItemsGroupByOutputType[P]>
        }
      >
    >


  export type InvoiceItemsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    item?: boolean
    quantity?: boolean
    unitOfMeasure?: boolean
    pricePerUnitOfMeasure?: boolean
    sum?: boolean
    currency?: boolean
    category?: boolean
    itemDescription?: boolean
    commentsForUser?: boolean
    isInvoice?: boolean
    invoiceId?: boolean
    siteId?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
    invoice?: boolean | InvoicesDefaultArgs<ExtArgs>
    Site?: boolean | InvoiceItems$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["invoiceItems"]>

  export type InvoiceItemsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    item?: boolean
    quantity?: boolean
    unitOfMeasure?: boolean
    pricePerUnitOfMeasure?: boolean
    sum?: boolean
    currency?: boolean
    category?: boolean
    itemDescription?: boolean
    commentsForUser?: boolean
    isInvoice?: boolean
    invoiceId?: boolean
    siteId?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
    invoice?: boolean | InvoicesDefaultArgs<ExtArgs>
    Site?: boolean | InvoiceItems$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["invoiceItems"]>

  export type InvoiceItemsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    item?: boolean
    quantity?: boolean
    unitOfMeasure?: boolean
    pricePerUnitOfMeasure?: boolean
    sum?: boolean
    currency?: boolean
    category?: boolean
    itemDescription?: boolean
    commentsForUser?: boolean
    isInvoice?: boolean
    invoiceId?: boolean
    siteId?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
    invoice?: boolean | InvoicesDefaultArgs<ExtArgs>
    Site?: boolean | InvoiceItems$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["invoiceItems"]>

  export type InvoiceItemsSelectScalar = {
    id?: boolean
    item?: boolean
    quantity?: boolean
    unitOfMeasure?: boolean
    pricePerUnitOfMeasure?: boolean
    sum?: boolean
    currency?: boolean
    category?: boolean
    itemDescription?: boolean
    commentsForUser?: boolean
    isInvoice?: boolean
    invoiceId?: boolean
    siteId?: boolean
    invoiceNumber?: boolean
    sellerName?: boolean
    invoiceDate?: boolean
    paymentDate?: boolean
  }

  export type InvoiceItemsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "item" | "quantity" | "unitOfMeasure" | "pricePerUnitOfMeasure" | "sum" | "currency" | "category" | "itemDescription" | "commentsForUser" | "isInvoice" | "invoiceId" | "siteId" | "invoiceNumber" | "sellerName" | "invoiceDate" | "paymentDate", ExtArgs["result"]["invoiceItems"]>
  export type InvoiceItemsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    invoice?: boolean | InvoicesDefaultArgs<ExtArgs>
    Site?: boolean | InvoiceItems$SiteArgs<ExtArgs>
  }
  export type InvoiceItemsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    invoice?: boolean | InvoicesDefaultArgs<ExtArgs>
    Site?: boolean | InvoiceItems$SiteArgs<ExtArgs>
  }
  export type InvoiceItemsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    invoice?: boolean | InvoicesDefaultArgs<ExtArgs>
    Site?: boolean | InvoiceItems$SiteArgs<ExtArgs>
  }

  export type $InvoiceItemsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "InvoiceItems"
    objects: {
      invoice: Prisma.$InvoicesPayload<ExtArgs>
      Site: Prisma.$SitePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      item: string | null
      quantity: number | null
      unitOfMeasure: string | null
      pricePerUnitOfMeasure: number | null
      sum: number | null
      currency: string | null
      category: string | null
      itemDescription: string | null
      commentsForUser: string | null
      isInvoice: boolean | null
      invoiceId: string
      siteId: string | null
      invoiceNumber: string | null
      sellerName: string | null
      invoiceDate: string | null
      paymentDate: string | null
    }, ExtArgs["result"]["invoiceItems"]>
    composites: {}
  }

  type InvoiceItemsGetPayload<S extends boolean | null | undefined | InvoiceItemsDefaultArgs> = $Result.GetResult<Prisma.$InvoiceItemsPayload, S>

  type InvoiceItemsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<InvoiceItemsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: InvoiceItemsCountAggregateInputType | true
    }

  export interface InvoiceItemsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['InvoiceItems'], meta: { name: 'InvoiceItems' } }
    /**
     * Find zero or one InvoiceItems that matches the filter.
     * @param {InvoiceItemsFindUniqueArgs} args - Arguments to find a InvoiceItems
     * @example
     * // Get one InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends InvoiceItemsFindUniqueArgs>(args: SelectSubset<T, InvoiceItemsFindUniqueArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one InvoiceItems that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {InvoiceItemsFindUniqueOrThrowArgs} args - Arguments to find a InvoiceItems
     * @example
     * // Get one InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends InvoiceItemsFindUniqueOrThrowArgs>(args: SelectSubset<T, InvoiceItemsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first InvoiceItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoiceItemsFindFirstArgs} args - Arguments to find a InvoiceItems
     * @example
     * // Get one InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends InvoiceItemsFindFirstArgs>(args?: SelectSubset<T, InvoiceItemsFindFirstArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first InvoiceItems that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoiceItemsFindFirstOrThrowArgs} args - Arguments to find a InvoiceItems
     * @example
     * // Get one InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends InvoiceItemsFindFirstOrThrowArgs>(args?: SelectSubset<T, InvoiceItemsFindFirstOrThrowArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more InvoiceItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoiceItemsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.findMany()
     * 
     * // Get first 10 InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const invoiceItemsWithIdOnly = await prisma.invoiceItems.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends InvoiceItemsFindManyArgs>(args?: SelectSubset<T, InvoiceItemsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a InvoiceItems.
     * @param {InvoiceItemsCreateArgs} args - Arguments to create a InvoiceItems.
     * @example
     * // Create one InvoiceItems
     * const InvoiceItems = await prisma.invoiceItems.create({
     *   data: {
     *     // ... data to create a InvoiceItems
     *   }
     * })
     * 
     */
    create<T extends InvoiceItemsCreateArgs>(args: SelectSubset<T, InvoiceItemsCreateArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many InvoiceItems.
     * @param {InvoiceItemsCreateManyArgs} args - Arguments to create many InvoiceItems.
     * @example
     * // Create many InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends InvoiceItemsCreateManyArgs>(args?: SelectSubset<T, InvoiceItemsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many InvoiceItems and returns the data saved in the database.
     * @param {InvoiceItemsCreateManyAndReturnArgs} args - Arguments to create many InvoiceItems.
     * @example
     * // Create many InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many InvoiceItems and only return the `id`
     * const invoiceItemsWithIdOnly = await prisma.invoiceItems.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends InvoiceItemsCreateManyAndReturnArgs>(args?: SelectSubset<T, InvoiceItemsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a InvoiceItems.
     * @param {InvoiceItemsDeleteArgs} args - Arguments to delete one InvoiceItems.
     * @example
     * // Delete one InvoiceItems
     * const InvoiceItems = await prisma.invoiceItems.delete({
     *   where: {
     *     // ... filter to delete one InvoiceItems
     *   }
     * })
     * 
     */
    delete<T extends InvoiceItemsDeleteArgs>(args: SelectSubset<T, InvoiceItemsDeleteArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one InvoiceItems.
     * @param {InvoiceItemsUpdateArgs} args - Arguments to update one InvoiceItems.
     * @example
     * // Update one InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends InvoiceItemsUpdateArgs>(args: SelectSubset<T, InvoiceItemsUpdateArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more InvoiceItems.
     * @param {InvoiceItemsDeleteManyArgs} args - Arguments to filter InvoiceItems to delete.
     * @example
     * // Delete a few InvoiceItems
     * const { count } = await prisma.invoiceItems.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends InvoiceItemsDeleteManyArgs>(args?: SelectSubset<T, InvoiceItemsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InvoiceItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoiceItemsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends InvoiceItemsUpdateManyArgs>(args: SelectSubset<T, InvoiceItemsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more InvoiceItems and returns the data updated in the database.
     * @param {InvoiceItemsUpdateManyAndReturnArgs} args - Arguments to update many InvoiceItems.
     * @example
     * // Update many InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more InvoiceItems and only return the `id`
     * const invoiceItemsWithIdOnly = await prisma.invoiceItems.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends InvoiceItemsUpdateManyAndReturnArgs>(args: SelectSubset<T, InvoiceItemsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one InvoiceItems.
     * @param {InvoiceItemsUpsertArgs} args - Arguments to update or create a InvoiceItems.
     * @example
     * // Update or create a InvoiceItems
     * const invoiceItems = await prisma.invoiceItems.upsert({
     *   create: {
     *     // ... data to create a InvoiceItems
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the InvoiceItems we want to update
     *   }
     * })
     */
    upsert<T extends InvoiceItemsUpsertArgs>(args: SelectSubset<T, InvoiceItemsUpsertArgs<ExtArgs>>): Prisma__InvoiceItemsClient<$Result.GetResult<Prisma.$InvoiceItemsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of InvoiceItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoiceItemsCountArgs} args - Arguments to filter InvoiceItems to count.
     * @example
     * // Count the number of InvoiceItems
     * const count = await prisma.invoiceItems.count({
     *   where: {
     *     // ... the filter for the InvoiceItems we want to count
     *   }
     * })
    **/
    count<T extends InvoiceItemsCountArgs>(
      args?: Subset<T, InvoiceItemsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], InvoiceItemsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a InvoiceItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoiceItemsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends InvoiceItemsAggregateArgs>(args: Subset<T, InvoiceItemsAggregateArgs>): Prisma.PrismaPromise<GetInvoiceItemsAggregateType<T>>

    /**
     * Group by InvoiceItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {InvoiceItemsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends InvoiceItemsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: InvoiceItemsGroupByArgs['orderBy'] }
        : { orderBy?: InvoiceItemsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, InvoiceItemsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInvoiceItemsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the InvoiceItems model
   */
  readonly fields: InvoiceItemsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for InvoiceItems.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__InvoiceItemsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    invoice<T extends InvoicesDefaultArgs<ExtArgs> = {}>(args?: Subset<T, InvoicesDefaultArgs<ExtArgs>>): Prisma__InvoicesClient<$Result.GetResult<Prisma.$InvoicesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    Site<T extends InvoiceItems$SiteArgs<ExtArgs> = {}>(args?: Subset<T, InvoiceItems$SiteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the InvoiceItems model
   */
  interface InvoiceItemsFieldRefs {
    readonly id: FieldRef<"InvoiceItems", 'String'>
    readonly item: FieldRef<"InvoiceItems", 'String'>
    readonly quantity: FieldRef<"InvoiceItems", 'Float'>
    readonly unitOfMeasure: FieldRef<"InvoiceItems", 'String'>
    readonly pricePerUnitOfMeasure: FieldRef<"InvoiceItems", 'Float'>
    readonly sum: FieldRef<"InvoiceItems", 'Float'>
    readonly currency: FieldRef<"InvoiceItems", 'String'>
    readonly category: FieldRef<"InvoiceItems", 'String'>
    readonly itemDescription: FieldRef<"InvoiceItems", 'String'>
    readonly commentsForUser: FieldRef<"InvoiceItems", 'String'>
    readonly isInvoice: FieldRef<"InvoiceItems", 'Boolean'>
    readonly invoiceId: FieldRef<"InvoiceItems", 'String'>
    readonly siteId: FieldRef<"InvoiceItems", 'String'>
    readonly invoiceNumber: FieldRef<"InvoiceItems", 'String'>
    readonly sellerName: FieldRef<"InvoiceItems", 'String'>
    readonly invoiceDate: FieldRef<"InvoiceItems", 'String'>
    readonly paymentDate: FieldRef<"InvoiceItems", 'String'>
  }
    

  // Custom InputTypes
  /**
   * InvoiceItems findUnique
   */
  export type InvoiceItemsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * Filter, which InvoiceItems to fetch.
     */
    where: InvoiceItemsWhereUniqueInput
  }

  /**
   * InvoiceItems findUniqueOrThrow
   */
  export type InvoiceItemsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * Filter, which InvoiceItems to fetch.
     */
    where: InvoiceItemsWhereUniqueInput
  }

  /**
   * InvoiceItems findFirst
   */
  export type InvoiceItemsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * Filter, which InvoiceItems to fetch.
     */
    where?: InvoiceItemsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvoiceItems to fetch.
     */
    orderBy?: InvoiceItemsOrderByWithRelationInput | InvoiceItemsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InvoiceItems.
     */
    cursor?: InvoiceItemsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvoiceItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvoiceItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InvoiceItems.
     */
    distinct?: InvoiceItemsScalarFieldEnum | InvoiceItemsScalarFieldEnum[]
  }

  /**
   * InvoiceItems findFirstOrThrow
   */
  export type InvoiceItemsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * Filter, which InvoiceItems to fetch.
     */
    where?: InvoiceItemsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvoiceItems to fetch.
     */
    orderBy?: InvoiceItemsOrderByWithRelationInput | InvoiceItemsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for InvoiceItems.
     */
    cursor?: InvoiceItemsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvoiceItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvoiceItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of InvoiceItems.
     */
    distinct?: InvoiceItemsScalarFieldEnum | InvoiceItemsScalarFieldEnum[]
  }

  /**
   * InvoiceItems findMany
   */
  export type InvoiceItemsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * Filter, which InvoiceItems to fetch.
     */
    where?: InvoiceItemsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of InvoiceItems to fetch.
     */
    orderBy?: InvoiceItemsOrderByWithRelationInput | InvoiceItemsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing InvoiceItems.
     */
    cursor?: InvoiceItemsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` InvoiceItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` InvoiceItems.
     */
    skip?: number
    distinct?: InvoiceItemsScalarFieldEnum | InvoiceItemsScalarFieldEnum[]
  }

  /**
   * InvoiceItems create
   */
  export type InvoiceItemsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * The data needed to create a InvoiceItems.
     */
    data: XOR<InvoiceItemsCreateInput, InvoiceItemsUncheckedCreateInput>
  }

  /**
   * InvoiceItems createMany
   */
  export type InvoiceItemsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many InvoiceItems.
     */
    data: InvoiceItemsCreateManyInput | InvoiceItemsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * InvoiceItems createManyAndReturn
   */
  export type InvoiceItemsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * The data used to create many InvoiceItems.
     */
    data: InvoiceItemsCreateManyInput | InvoiceItemsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * InvoiceItems update
   */
  export type InvoiceItemsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * The data needed to update a InvoiceItems.
     */
    data: XOR<InvoiceItemsUpdateInput, InvoiceItemsUncheckedUpdateInput>
    /**
     * Choose, which InvoiceItems to update.
     */
    where: InvoiceItemsWhereUniqueInput
  }

  /**
   * InvoiceItems updateMany
   */
  export type InvoiceItemsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update InvoiceItems.
     */
    data: XOR<InvoiceItemsUpdateManyMutationInput, InvoiceItemsUncheckedUpdateManyInput>
    /**
     * Filter which InvoiceItems to update
     */
    where?: InvoiceItemsWhereInput
    /**
     * Limit how many InvoiceItems to update.
     */
    limit?: number
  }

  /**
   * InvoiceItems updateManyAndReturn
   */
  export type InvoiceItemsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * The data used to update InvoiceItems.
     */
    data: XOR<InvoiceItemsUpdateManyMutationInput, InvoiceItemsUncheckedUpdateManyInput>
    /**
     * Filter which InvoiceItems to update
     */
    where?: InvoiceItemsWhereInput
    /**
     * Limit how many InvoiceItems to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * InvoiceItems upsert
   */
  export type InvoiceItemsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * The filter to search for the InvoiceItems to update in case it exists.
     */
    where: InvoiceItemsWhereUniqueInput
    /**
     * In case the InvoiceItems found by the `where` argument doesn't exist, create a new InvoiceItems with this data.
     */
    create: XOR<InvoiceItemsCreateInput, InvoiceItemsUncheckedCreateInput>
    /**
     * In case the InvoiceItems was found with the provided `where` argument, update it with this data.
     */
    update: XOR<InvoiceItemsUpdateInput, InvoiceItemsUncheckedUpdateInput>
  }

  /**
   * InvoiceItems delete
   */
  export type InvoiceItemsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
    /**
     * Filter which InvoiceItems to delete.
     */
    where: InvoiceItemsWhereUniqueInput
  }

  /**
   * InvoiceItems deleteMany
   */
  export type InvoiceItemsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which InvoiceItems to delete
     */
    where?: InvoiceItemsWhereInput
    /**
     * Limit how many InvoiceItems to delete.
     */
    limit?: number
  }

  /**
   * InvoiceItems.Site
   */
  export type InvoiceItems$SiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
  }

  /**
   * InvoiceItems without action
   */
  export type InvoiceItemsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the InvoiceItems
     */
    select?: InvoiceItemsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the InvoiceItems
     */
    omit?: InvoiceItemsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: InvoiceItemsInclude<ExtArgs> | null
  }


  /**
   * Model AIconversation
   */

  export type AggregateAIconversation = {
    _count: AIconversationCountAggregateOutputType | null
    _min: AIconversationMinAggregateOutputType | null
    _max: AIconversationMaxAggregateOutputType | null
  }

  export type AIconversationMinAggregateOutputType = {
    id: string | null
    userId: string | null
    siteId: string | null
  }

  export type AIconversationMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    siteId: string | null
  }

  export type AIconversationCountAggregateOutputType = {
    id: number
    thread: number
    userId: number
    siteId: number
    _all: number
  }


  export type AIconversationMinAggregateInputType = {
    id?: true
    userId?: true
    siteId?: true
  }

  export type AIconversationMaxAggregateInputType = {
    id?: true
    userId?: true
    siteId?: true
  }

  export type AIconversationCountAggregateInputType = {
    id?: true
    thread?: true
    userId?: true
    siteId?: true
    _all?: true
  }

  export type AIconversationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIconversation to aggregate.
     */
    where?: AIconversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIconversations to fetch.
     */
    orderBy?: AIconversationOrderByWithRelationInput | AIconversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AIconversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIconversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIconversations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AIconversations
    **/
    _count?: true | AIconversationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AIconversationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AIconversationMaxAggregateInputType
  }

  export type GetAIconversationAggregateType<T extends AIconversationAggregateArgs> = {
        [P in keyof T & keyof AggregateAIconversation]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAIconversation[P]>
      : GetScalarType<T[P], AggregateAIconversation[P]>
  }




  export type AIconversationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AIconversationWhereInput
    orderBy?: AIconversationOrderByWithAggregationInput | AIconversationOrderByWithAggregationInput[]
    by: AIconversationScalarFieldEnum[] | AIconversationScalarFieldEnum
    having?: AIconversationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AIconversationCountAggregateInputType | true
    _min?: AIconversationMinAggregateInputType
    _max?: AIconversationMaxAggregateInputType
  }

  export type AIconversationGroupByOutputType = {
    id: string
    thread: JsonValue | null
    userId: string
    siteId: string
    _count: AIconversationCountAggregateOutputType | null
    _min: AIconversationMinAggregateOutputType | null
    _max: AIconversationMaxAggregateOutputType | null
  }

  type GetAIconversationGroupByPayload<T extends AIconversationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AIconversationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AIconversationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AIconversationGroupByOutputType[P]>
            : GetScalarType<T[P], AIconversationGroupByOutputType[P]>
        }
      >
    >


  export type AIconversationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    thread?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | AIconversation$UserArgs<ExtArgs>
    site?: boolean | AIconversation$siteArgs<ExtArgs>
  }, ExtArgs["result"]["aIconversation"]>

  export type AIconversationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    thread?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | AIconversation$UserArgs<ExtArgs>
    site?: boolean | AIconversation$siteArgs<ExtArgs>
  }, ExtArgs["result"]["aIconversation"]>

  export type AIconversationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    thread?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | AIconversation$UserArgs<ExtArgs>
    site?: boolean | AIconversation$siteArgs<ExtArgs>
  }, ExtArgs["result"]["aIconversation"]>

  export type AIconversationSelectScalar = {
    id?: boolean
    thread?: boolean
    userId?: boolean
    siteId?: boolean
  }

  export type AIconversationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "thread" | "userId" | "siteId", ExtArgs["result"]["aIconversation"]>
  export type AIconversationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | AIconversation$UserArgs<ExtArgs>
    site?: boolean | AIconversation$siteArgs<ExtArgs>
  }
  export type AIconversationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | AIconversation$UserArgs<ExtArgs>
    site?: boolean | AIconversation$siteArgs<ExtArgs>
  }
  export type AIconversationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | AIconversation$UserArgs<ExtArgs>
    site?: boolean | AIconversation$siteArgs<ExtArgs>
  }

  export type $AIconversationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AIconversation"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
      site: Prisma.$SitePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      thread: Prisma.JsonValue | null
      userId: string
      siteId: string
    }, ExtArgs["result"]["aIconversation"]>
    composites: {}
  }

  type AIconversationGetPayload<S extends boolean | null | undefined | AIconversationDefaultArgs> = $Result.GetResult<Prisma.$AIconversationPayload, S>

  type AIconversationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AIconversationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AIconversationCountAggregateInputType | true
    }

  export interface AIconversationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AIconversation'], meta: { name: 'AIconversation' } }
    /**
     * Find zero or one AIconversation that matches the filter.
     * @param {AIconversationFindUniqueArgs} args - Arguments to find a AIconversation
     * @example
     * // Get one AIconversation
     * const aIconversation = await prisma.aIconversation.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AIconversationFindUniqueArgs>(args: SelectSubset<T, AIconversationFindUniqueArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AIconversation that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AIconversationFindUniqueOrThrowArgs} args - Arguments to find a AIconversation
     * @example
     * // Get one AIconversation
     * const aIconversation = await prisma.aIconversation.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AIconversationFindUniqueOrThrowArgs>(args: SelectSubset<T, AIconversationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIconversation that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIconversationFindFirstArgs} args - Arguments to find a AIconversation
     * @example
     * // Get one AIconversation
     * const aIconversation = await prisma.aIconversation.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AIconversationFindFirstArgs>(args?: SelectSubset<T, AIconversationFindFirstArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AIconversation that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIconversationFindFirstOrThrowArgs} args - Arguments to find a AIconversation
     * @example
     * // Get one AIconversation
     * const aIconversation = await prisma.aIconversation.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AIconversationFindFirstOrThrowArgs>(args?: SelectSubset<T, AIconversationFindFirstOrThrowArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AIconversations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIconversationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AIconversations
     * const aIconversations = await prisma.aIconversation.findMany()
     * 
     * // Get first 10 AIconversations
     * const aIconversations = await prisma.aIconversation.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const aIconversationWithIdOnly = await prisma.aIconversation.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AIconversationFindManyArgs>(args?: SelectSubset<T, AIconversationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AIconversation.
     * @param {AIconversationCreateArgs} args - Arguments to create a AIconversation.
     * @example
     * // Create one AIconversation
     * const AIconversation = await prisma.aIconversation.create({
     *   data: {
     *     // ... data to create a AIconversation
     *   }
     * })
     * 
     */
    create<T extends AIconversationCreateArgs>(args: SelectSubset<T, AIconversationCreateArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AIconversations.
     * @param {AIconversationCreateManyArgs} args - Arguments to create many AIconversations.
     * @example
     * // Create many AIconversations
     * const aIconversation = await prisma.aIconversation.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AIconversationCreateManyArgs>(args?: SelectSubset<T, AIconversationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AIconversations and returns the data saved in the database.
     * @param {AIconversationCreateManyAndReturnArgs} args - Arguments to create many AIconversations.
     * @example
     * // Create many AIconversations
     * const aIconversation = await prisma.aIconversation.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AIconversations and only return the `id`
     * const aIconversationWithIdOnly = await prisma.aIconversation.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AIconversationCreateManyAndReturnArgs>(args?: SelectSubset<T, AIconversationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AIconversation.
     * @param {AIconversationDeleteArgs} args - Arguments to delete one AIconversation.
     * @example
     * // Delete one AIconversation
     * const AIconversation = await prisma.aIconversation.delete({
     *   where: {
     *     // ... filter to delete one AIconversation
     *   }
     * })
     * 
     */
    delete<T extends AIconversationDeleteArgs>(args: SelectSubset<T, AIconversationDeleteArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AIconversation.
     * @param {AIconversationUpdateArgs} args - Arguments to update one AIconversation.
     * @example
     * // Update one AIconversation
     * const aIconversation = await prisma.aIconversation.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AIconversationUpdateArgs>(args: SelectSubset<T, AIconversationUpdateArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AIconversations.
     * @param {AIconversationDeleteManyArgs} args - Arguments to filter AIconversations to delete.
     * @example
     * // Delete a few AIconversations
     * const { count } = await prisma.aIconversation.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AIconversationDeleteManyArgs>(args?: SelectSubset<T, AIconversationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIconversations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIconversationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AIconversations
     * const aIconversation = await prisma.aIconversation.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AIconversationUpdateManyArgs>(args: SelectSubset<T, AIconversationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AIconversations and returns the data updated in the database.
     * @param {AIconversationUpdateManyAndReturnArgs} args - Arguments to update many AIconversations.
     * @example
     * // Update many AIconversations
     * const aIconversation = await prisma.aIconversation.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AIconversations and only return the `id`
     * const aIconversationWithIdOnly = await prisma.aIconversation.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AIconversationUpdateManyAndReturnArgs>(args: SelectSubset<T, AIconversationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AIconversation.
     * @param {AIconversationUpsertArgs} args - Arguments to update or create a AIconversation.
     * @example
     * // Update or create a AIconversation
     * const aIconversation = await prisma.aIconversation.upsert({
     *   create: {
     *     // ... data to create a AIconversation
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AIconversation we want to update
     *   }
     * })
     */
    upsert<T extends AIconversationUpsertArgs>(args: SelectSubset<T, AIconversationUpsertArgs<ExtArgs>>): Prisma__AIconversationClient<$Result.GetResult<Prisma.$AIconversationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AIconversations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIconversationCountArgs} args - Arguments to filter AIconversations to count.
     * @example
     * // Count the number of AIconversations
     * const count = await prisma.aIconversation.count({
     *   where: {
     *     // ... the filter for the AIconversations we want to count
     *   }
     * })
    **/
    count<T extends AIconversationCountArgs>(
      args?: Subset<T, AIconversationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AIconversationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AIconversation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIconversationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AIconversationAggregateArgs>(args: Subset<T, AIconversationAggregateArgs>): Prisma.PrismaPromise<GetAIconversationAggregateType<T>>

    /**
     * Group by AIconversation.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AIconversationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AIconversationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AIconversationGroupByArgs['orderBy'] }
        : { orderBy?: AIconversationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AIconversationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAIconversationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AIconversation model
   */
  readonly fields: AIconversationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AIconversation.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AIconversationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends AIconversation$UserArgs<ExtArgs> = {}>(args?: Subset<T, AIconversation$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    site<T extends AIconversation$siteArgs<ExtArgs> = {}>(args?: Subset<T, AIconversation$siteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AIconversation model
   */
  interface AIconversationFieldRefs {
    readonly id: FieldRef<"AIconversation", 'String'>
    readonly thread: FieldRef<"AIconversation", 'Json'>
    readonly userId: FieldRef<"AIconversation", 'String'>
    readonly siteId: FieldRef<"AIconversation", 'String'>
  }
    

  // Custom InputTypes
  /**
   * AIconversation findUnique
   */
  export type AIconversationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * Filter, which AIconversation to fetch.
     */
    where: AIconversationWhereUniqueInput
  }

  /**
   * AIconversation findUniqueOrThrow
   */
  export type AIconversationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * Filter, which AIconversation to fetch.
     */
    where: AIconversationWhereUniqueInput
  }

  /**
   * AIconversation findFirst
   */
  export type AIconversationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * Filter, which AIconversation to fetch.
     */
    where?: AIconversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIconversations to fetch.
     */
    orderBy?: AIconversationOrderByWithRelationInput | AIconversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIconversations.
     */
    cursor?: AIconversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIconversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIconversations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIconversations.
     */
    distinct?: AIconversationScalarFieldEnum | AIconversationScalarFieldEnum[]
  }

  /**
   * AIconversation findFirstOrThrow
   */
  export type AIconversationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * Filter, which AIconversation to fetch.
     */
    where?: AIconversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIconversations to fetch.
     */
    orderBy?: AIconversationOrderByWithRelationInput | AIconversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AIconversations.
     */
    cursor?: AIconversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIconversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIconversations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AIconversations.
     */
    distinct?: AIconversationScalarFieldEnum | AIconversationScalarFieldEnum[]
  }

  /**
   * AIconversation findMany
   */
  export type AIconversationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * Filter, which AIconversations to fetch.
     */
    where?: AIconversationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AIconversations to fetch.
     */
    orderBy?: AIconversationOrderByWithRelationInput | AIconversationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AIconversations.
     */
    cursor?: AIconversationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AIconversations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AIconversations.
     */
    skip?: number
    distinct?: AIconversationScalarFieldEnum | AIconversationScalarFieldEnum[]
  }

  /**
   * AIconversation create
   */
  export type AIconversationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * The data needed to create a AIconversation.
     */
    data: XOR<AIconversationCreateInput, AIconversationUncheckedCreateInput>
  }

  /**
   * AIconversation createMany
   */
  export type AIconversationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AIconversations.
     */
    data: AIconversationCreateManyInput | AIconversationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AIconversation createManyAndReturn
   */
  export type AIconversationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * The data used to create many AIconversations.
     */
    data: AIconversationCreateManyInput | AIconversationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIconversation update
   */
  export type AIconversationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * The data needed to update a AIconversation.
     */
    data: XOR<AIconversationUpdateInput, AIconversationUncheckedUpdateInput>
    /**
     * Choose, which AIconversation to update.
     */
    where: AIconversationWhereUniqueInput
  }

  /**
   * AIconversation updateMany
   */
  export type AIconversationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AIconversations.
     */
    data: XOR<AIconversationUpdateManyMutationInput, AIconversationUncheckedUpdateManyInput>
    /**
     * Filter which AIconversations to update
     */
    where?: AIconversationWhereInput
    /**
     * Limit how many AIconversations to update.
     */
    limit?: number
  }

  /**
   * AIconversation updateManyAndReturn
   */
  export type AIconversationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * The data used to update AIconversations.
     */
    data: XOR<AIconversationUpdateManyMutationInput, AIconversationUncheckedUpdateManyInput>
    /**
     * Filter which AIconversations to update
     */
    where?: AIconversationWhereInput
    /**
     * Limit how many AIconversations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * AIconversation upsert
   */
  export type AIconversationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * The filter to search for the AIconversation to update in case it exists.
     */
    where: AIconversationWhereUniqueInput
    /**
     * In case the AIconversation found by the `where` argument doesn't exist, create a new AIconversation with this data.
     */
    create: XOR<AIconversationCreateInput, AIconversationUncheckedCreateInput>
    /**
     * In case the AIconversation was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AIconversationUpdateInput, AIconversationUncheckedUpdateInput>
  }

  /**
   * AIconversation delete
   */
  export type AIconversationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
    /**
     * Filter which AIconversation to delete.
     */
    where: AIconversationWhereUniqueInput
  }

  /**
   * AIconversation deleteMany
   */
  export type AIconversationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AIconversations to delete
     */
    where?: AIconversationWhereInput
    /**
     * Limit how many AIconversations to delete.
     */
    limit?: number
  }

  /**
   * AIconversation.User
   */
  export type AIconversation$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * AIconversation.site
   */
  export type AIconversation$siteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
  }

  /**
   * AIconversation without action
   */
  export type AIconversationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AIconversation
     */
    select?: AIconversationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AIconversation
     */
    omit?: AIconversationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AIconversationInclude<ExtArgs> | null
  }


  /**
   * Model Documents
   */

  export type AggregateDocuments = {
    _count: DocumentsCountAggregateOutputType | null
    _min: DocumentsMinAggregateOutputType | null
    _max: DocumentsMaxAggregateOutputType | null
  }

  export type DocumentsMinAggregateOutputType = {
    id: string | null
    url: string | null
    documentType: string | null
    documentName: string | null
    description: string | null
    userId: string | null
    siteId: string | null
  }

  export type DocumentsMaxAggregateOutputType = {
    id: string | null
    url: string | null
    documentType: string | null
    documentName: string | null
    description: string | null
    userId: string | null
    siteId: string | null
  }

  export type DocumentsCountAggregateOutputType = {
    id: number
    url: number
    documentType: number
    documentName: number
    description: number
    userId: number
    siteId: number
    _all: number
  }


  export type DocumentsMinAggregateInputType = {
    id?: true
    url?: true
    documentType?: true
    documentName?: true
    description?: true
    userId?: true
    siteId?: true
  }

  export type DocumentsMaxAggregateInputType = {
    id?: true
    url?: true
    documentType?: true
    documentName?: true
    description?: true
    userId?: true
    siteId?: true
  }

  export type DocumentsCountAggregateInputType = {
    id?: true
    url?: true
    documentType?: true
    documentName?: true
    description?: true
    userId?: true
    siteId?: true
    _all?: true
  }

  export type DocumentsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Documents to aggregate.
     */
    where?: DocumentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentsOrderByWithRelationInput | DocumentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DocumentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Documents
    **/
    _count?: true | DocumentsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DocumentsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DocumentsMaxAggregateInputType
  }

  export type GetDocumentsAggregateType<T extends DocumentsAggregateArgs> = {
        [P in keyof T & keyof AggregateDocuments]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDocuments[P]>
      : GetScalarType<T[P], AggregateDocuments[P]>
  }




  export type DocumentsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DocumentsWhereInput
    orderBy?: DocumentsOrderByWithAggregationInput | DocumentsOrderByWithAggregationInput[]
    by: DocumentsScalarFieldEnum[] | DocumentsScalarFieldEnum
    having?: DocumentsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DocumentsCountAggregateInputType | true
    _min?: DocumentsMinAggregateInputType
    _max?: DocumentsMaxAggregateInputType
  }

  export type DocumentsGroupByOutputType = {
    id: string
    url: string
    documentType: string
    documentName: string
    description: string
    userId: string | null
    siteId: string | null
    _count: DocumentsCountAggregateOutputType | null
    _min: DocumentsMinAggregateOutputType | null
    _max: DocumentsMaxAggregateOutputType | null
  }

  type GetDocumentsGroupByPayload<T extends DocumentsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DocumentsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DocumentsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DocumentsGroupByOutputType[P]>
            : GetScalarType<T[P], DocumentsGroupByOutputType[P]>
        }
      >
    >


  export type DocumentsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    documentType?: boolean
    documentName?: boolean
    description?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | Documents$UserArgs<ExtArgs>
    Site?: boolean | Documents$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["documents"]>

  export type DocumentsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    documentType?: boolean
    documentName?: boolean
    description?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | Documents$UserArgs<ExtArgs>
    Site?: boolean | Documents$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["documents"]>

  export type DocumentsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    url?: boolean
    documentType?: boolean
    documentName?: boolean
    description?: boolean
    userId?: boolean
    siteId?: boolean
    User?: boolean | Documents$UserArgs<ExtArgs>
    Site?: boolean | Documents$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["documents"]>

  export type DocumentsSelectScalar = {
    id?: boolean
    url?: boolean
    documentType?: boolean
    documentName?: boolean
    description?: boolean
    userId?: boolean
    siteId?: boolean
  }

  export type DocumentsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "url" | "documentType" | "documentName" | "description" | "userId" | "siteId", ExtArgs["result"]["documents"]>
  export type DocumentsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Documents$UserArgs<ExtArgs>
    Site?: boolean | Documents$SiteArgs<ExtArgs>
  }
  export type DocumentsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Documents$UserArgs<ExtArgs>
    Site?: boolean | Documents$SiteArgs<ExtArgs>
  }
  export type DocumentsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | Documents$UserArgs<ExtArgs>
    Site?: boolean | Documents$SiteArgs<ExtArgs>
  }

  export type $DocumentsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Documents"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
      Site: Prisma.$SitePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      url: string
      documentType: string
      documentName: string
      description: string
      userId: string | null
      siteId: string | null
    }, ExtArgs["result"]["documents"]>
    composites: {}
  }

  type DocumentsGetPayload<S extends boolean | null | undefined | DocumentsDefaultArgs> = $Result.GetResult<Prisma.$DocumentsPayload, S>

  type DocumentsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DocumentsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DocumentsCountAggregateInputType | true
    }

  export interface DocumentsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Documents'], meta: { name: 'Documents' } }
    /**
     * Find zero or one Documents that matches the filter.
     * @param {DocumentsFindUniqueArgs} args - Arguments to find a Documents
     * @example
     * // Get one Documents
     * const documents = await prisma.documents.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DocumentsFindUniqueArgs>(args: SelectSubset<T, DocumentsFindUniqueArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Documents that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DocumentsFindUniqueOrThrowArgs} args - Arguments to find a Documents
     * @example
     * // Get one Documents
     * const documents = await prisma.documents.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DocumentsFindUniqueOrThrowArgs>(args: SelectSubset<T, DocumentsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Documents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentsFindFirstArgs} args - Arguments to find a Documents
     * @example
     * // Get one Documents
     * const documents = await prisma.documents.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DocumentsFindFirstArgs>(args?: SelectSubset<T, DocumentsFindFirstArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Documents that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentsFindFirstOrThrowArgs} args - Arguments to find a Documents
     * @example
     * // Get one Documents
     * const documents = await prisma.documents.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DocumentsFindFirstOrThrowArgs>(args?: SelectSubset<T, DocumentsFindFirstOrThrowArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Documents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Documents
     * const documents = await prisma.documents.findMany()
     * 
     * // Get first 10 Documents
     * const documents = await prisma.documents.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const documentsWithIdOnly = await prisma.documents.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DocumentsFindManyArgs>(args?: SelectSubset<T, DocumentsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Documents.
     * @param {DocumentsCreateArgs} args - Arguments to create a Documents.
     * @example
     * // Create one Documents
     * const Documents = await prisma.documents.create({
     *   data: {
     *     // ... data to create a Documents
     *   }
     * })
     * 
     */
    create<T extends DocumentsCreateArgs>(args: SelectSubset<T, DocumentsCreateArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Documents.
     * @param {DocumentsCreateManyArgs} args - Arguments to create many Documents.
     * @example
     * // Create many Documents
     * const documents = await prisma.documents.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DocumentsCreateManyArgs>(args?: SelectSubset<T, DocumentsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Documents and returns the data saved in the database.
     * @param {DocumentsCreateManyAndReturnArgs} args - Arguments to create many Documents.
     * @example
     * // Create many Documents
     * const documents = await prisma.documents.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Documents and only return the `id`
     * const documentsWithIdOnly = await prisma.documents.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DocumentsCreateManyAndReturnArgs>(args?: SelectSubset<T, DocumentsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Documents.
     * @param {DocumentsDeleteArgs} args - Arguments to delete one Documents.
     * @example
     * // Delete one Documents
     * const Documents = await prisma.documents.delete({
     *   where: {
     *     // ... filter to delete one Documents
     *   }
     * })
     * 
     */
    delete<T extends DocumentsDeleteArgs>(args: SelectSubset<T, DocumentsDeleteArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Documents.
     * @param {DocumentsUpdateArgs} args - Arguments to update one Documents.
     * @example
     * // Update one Documents
     * const documents = await prisma.documents.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DocumentsUpdateArgs>(args: SelectSubset<T, DocumentsUpdateArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Documents.
     * @param {DocumentsDeleteManyArgs} args - Arguments to filter Documents to delete.
     * @example
     * // Delete a few Documents
     * const { count } = await prisma.documents.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DocumentsDeleteManyArgs>(args?: SelectSubset<T, DocumentsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Documents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Documents
     * const documents = await prisma.documents.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DocumentsUpdateManyArgs>(args: SelectSubset<T, DocumentsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Documents and returns the data updated in the database.
     * @param {DocumentsUpdateManyAndReturnArgs} args - Arguments to update many Documents.
     * @example
     * // Update many Documents
     * const documents = await prisma.documents.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Documents and only return the `id`
     * const documentsWithIdOnly = await prisma.documents.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DocumentsUpdateManyAndReturnArgs>(args: SelectSubset<T, DocumentsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Documents.
     * @param {DocumentsUpsertArgs} args - Arguments to update or create a Documents.
     * @example
     * // Update or create a Documents
     * const documents = await prisma.documents.upsert({
     *   create: {
     *     // ... data to create a Documents
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Documents we want to update
     *   }
     * })
     */
    upsert<T extends DocumentsUpsertArgs>(args: SelectSubset<T, DocumentsUpsertArgs<ExtArgs>>): Prisma__DocumentsClient<$Result.GetResult<Prisma.$DocumentsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Documents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentsCountArgs} args - Arguments to filter Documents to count.
     * @example
     * // Count the number of Documents
     * const count = await prisma.documents.count({
     *   where: {
     *     // ... the filter for the Documents we want to count
     *   }
     * })
    **/
    count<T extends DocumentsCountArgs>(
      args?: Subset<T, DocumentsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DocumentsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Documents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DocumentsAggregateArgs>(args: Subset<T, DocumentsAggregateArgs>): Prisma.PrismaPromise<GetDocumentsAggregateType<T>>

    /**
     * Group by Documents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DocumentsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DocumentsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DocumentsGroupByArgs['orderBy'] }
        : { orderBy?: DocumentsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DocumentsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDocumentsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Documents model
   */
  readonly fields: DocumentsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Documents.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DocumentsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends Documents$UserArgs<ExtArgs> = {}>(args?: Subset<T, Documents$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    Site<T extends Documents$SiteArgs<ExtArgs> = {}>(args?: Subset<T, Documents$SiteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Documents model
   */
  interface DocumentsFieldRefs {
    readonly id: FieldRef<"Documents", 'String'>
    readonly url: FieldRef<"Documents", 'String'>
    readonly documentType: FieldRef<"Documents", 'String'>
    readonly documentName: FieldRef<"Documents", 'String'>
    readonly description: FieldRef<"Documents", 'String'>
    readonly userId: FieldRef<"Documents", 'String'>
    readonly siteId: FieldRef<"Documents", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Documents findUnique
   */
  export type DocumentsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * Filter, which Documents to fetch.
     */
    where: DocumentsWhereUniqueInput
  }

  /**
   * Documents findUniqueOrThrow
   */
  export type DocumentsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * Filter, which Documents to fetch.
     */
    where: DocumentsWhereUniqueInput
  }

  /**
   * Documents findFirst
   */
  export type DocumentsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * Filter, which Documents to fetch.
     */
    where?: DocumentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentsOrderByWithRelationInput | DocumentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Documents.
     */
    cursor?: DocumentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Documents.
     */
    distinct?: DocumentsScalarFieldEnum | DocumentsScalarFieldEnum[]
  }

  /**
   * Documents findFirstOrThrow
   */
  export type DocumentsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * Filter, which Documents to fetch.
     */
    where?: DocumentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentsOrderByWithRelationInput | DocumentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Documents.
     */
    cursor?: DocumentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Documents.
     */
    distinct?: DocumentsScalarFieldEnum | DocumentsScalarFieldEnum[]
  }

  /**
   * Documents findMany
   */
  export type DocumentsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * Filter, which Documents to fetch.
     */
    where?: DocumentsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Documents to fetch.
     */
    orderBy?: DocumentsOrderByWithRelationInput | DocumentsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Documents.
     */
    cursor?: DocumentsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Documents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Documents.
     */
    skip?: number
    distinct?: DocumentsScalarFieldEnum | DocumentsScalarFieldEnum[]
  }

  /**
   * Documents create
   */
  export type DocumentsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * The data needed to create a Documents.
     */
    data: XOR<DocumentsCreateInput, DocumentsUncheckedCreateInput>
  }

  /**
   * Documents createMany
   */
  export type DocumentsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Documents.
     */
    data: DocumentsCreateManyInput | DocumentsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Documents createManyAndReturn
   */
  export type DocumentsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * The data used to create many Documents.
     */
    data: DocumentsCreateManyInput | DocumentsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Documents update
   */
  export type DocumentsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * The data needed to update a Documents.
     */
    data: XOR<DocumentsUpdateInput, DocumentsUncheckedUpdateInput>
    /**
     * Choose, which Documents to update.
     */
    where: DocumentsWhereUniqueInput
  }

  /**
   * Documents updateMany
   */
  export type DocumentsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Documents.
     */
    data: XOR<DocumentsUpdateManyMutationInput, DocumentsUncheckedUpdateManyInput>
    /**
     * Filter which Documents to update
     */
    where?: DocumentsWhereInput
    /**
     * Limit how many Documents to update.
     */
    limit?: number
  }

  /**
   * Documents updateManyAndReturn
   */
  export type DocumentsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * The data used to update Documents.
     */
    data: XOR<DocumentsUpdateManyMutationInput, DocumentsUncheckedUpdateManyInput>
    /**
     * Filter which Documents to update
     */
    where?: DocumentsWhereInput
    /**
     * Limit how many Documents to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Documents upsert
   */
  export type DocumentsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * The filter to search for the Documents to update in case it exists.
     */
    where: DocumentsWhereUniqueInput
    /**
     * In case the Documents found by the `where` argument doesn't exist, create a new Documents with this data.
     */
    create: XOR<DocumentsCreateInput, DocumentsUncheckedCreateInput>
    /**
     * In case the Documents was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DocumentsUpdateInput, DocumentsUncheckedUpdateInput>
  }

  /**
   * Documents delete
   */
  export type DocumentsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
    /**
     * Filter which Documents to delete.
     */
    where: DocumentsWhereUniqueInput
  }

  /**
   * Documents deleteMany
   */
  export type DocumentsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Documents to delete
     */
    where?: DocumentsWhereInput
    /**
     * Limit how many Documents to delete.
     */
    limit?: number
  }

  /**
   * Documents.User
   */
  export type Documents$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Documents.Site
   */
  export type Documents$SiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
  }

  /**
   * Documents without action
   */
  export type DocumentsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Documents
     */
    select?: DocumentsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Documents
     */
    omit?: DocumentsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DocumentsInclude<ExtArgs> | null
  }


  /**
   * Model sitediaryrecords
   */

  export type AggregateSitediaryrecords = {
    _count: SitediaryrecordsCountAggregateOutputType | null
    _avg: SitediaryrecordsAvgAggregateOutputType | null
    _sum: SitediaryrecordsSumAggregateOutputType | null
    _min: SitediaryrecordsMinAggregateOutputType | null
    _max: SitediaryrecordsMaxAggregateOutputType | null
  }

  export type SitediaryrecordsAvgAggregateOutputType = {
    Amounts: number | null
    WorkersInvolved: number | null
    TimeInvolved: number | null
  }

  export type SitediaryrecordsSumAggregateOutputType = {
    Amounts: number | null
    WorkersInvolved: number | null
    TimeInvolved: number | null
  }

  export type SitediaryrecordsMinAggregateOutputType = {
    id: string | null
    userId: string | null
    siteId: string | null
    Date: Date | null
    Location: string | null
    Works: string | null
    Comments: string | null
    Units: string | null
    Amounts: number | null
    WorkersInvolved: number | null
    TimeInvolved: number | null
  }

  export type SitediaryrecordsMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    siteId: string | null
    Date: Date | null
    Location: string | null
    Works: string | null
    Comments: string | null
    Units: string | null
    Amounts: number | null
    WorkersInvolved: number | null
    TimeInvolved: number | null
  }

  export type SitediaryrecordsCountAggregateOutputType = {
    id: number
    userId: number
    siteId: number
    Date: number
    Location: number
    Works: number
    Comments: number
    Units: number
    Amounts: number
    WorkersInvolved: number
    TimeInvolved: number
    Photos: number
    _all: number
  }


  export type SitediaryrecordsAvgAggregateInputType = {
    Amounts?: true
    WorkersInvolved?: true
    TimeInvolved?: true
  }

  export type SitediaryrecordsSumAggregateInputType = {
    Amounts?: true
    WorkersInvolved?: true
    TimeInvolved?: true
  }

  export type SitediaryrecordsMinAggregateInputType = {
    id?: true
    userId?: true
    siteId?: true
    Date?: true
    Location?: true
    Works?: true
    Comments?: true
    Units?: true
    Amounts?: true
    WorkersInvolved?: true
    TimeInvolved?: true
  }

  export type SitediaryrecordsMaxAggregateInputType = {
    id?: true
    userId?: true
    siteId?: true
    Date?: true
    Location?: true
    Works?: true
    Comments?: true
    Units?: true
    Amounts?: true
    WorkersInvolved?: true
    TimeInvolved?: true
  }

  export type SitediaryrecordsCountAggregateInputType = {
    id?: true
    userId?: true
    siteId?: true
    Date?: true
    Location?: true
    Works?: true
    Comments?: true
    Units?: true
    Amounts?: true
    WorkersInvolved?: true
    TimeInvolved?: true
    Photos?: true
    _all?: true
  }

  export type SitediaryrecordsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which sitediaryrecords to aggregate.
     */
    where?: sitediaryrecordsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediaryrecords to fetch.
     */
    orderBy?: sitediaryrecordsOrderByWithRelationInput | sitediaryrecordsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: sitediaryrecordsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediaryrecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediaryrecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned sitediaryrecords
    **/
    _count?: true | SitediaryrecordsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SitediaryrecordsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SitediaryrecordsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SitediaryrecordsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SitediaryrecordsMaxAggregateInputType
  }

  export type GetSitediaryrecordsAggregateType<T extends SitediaryrecordsAggregateArgs> = {
        [P in keyof T & keyof AggregateSitediaryrecords]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSitediaryrecords[P]>
      : GetScalarType<T[P], AggregateSitediaryrecords[P]>
  }




  export type sitediaryrecordsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: sitediaryrecordsWhereInput
    orderBy?: sitediaryrecordsOrderByWithAggregationInput | sitediaryrecordsOrderByWithAggregationInput[]
    by: SitediaryrecordsScalarFieldEnum[] | SitediaryrecordsScalarFieldEnum
    having?: sitediaryrecordsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SitediaryrecordsCountAggregateInputType | true
    _avg?: SitediaryrecordsAvgAggregateInputType
    _sum?: SitediaryrecordsSumAggregateInputType
    _min?: SitediaryrecordsMinAggregateInputType
    _max?: SitediaryrecordsMaxAggregateInputType
  }

  export type SitediaryrecordsGroupByOutputType = {
    id: string
    userId: string | null
    siteId: string | null
    Date: Date | null
    Location: string | null
    Works: string | null
    Comments: string | null
    Units: string | null
    Amounts: number | null
    WorkersInvolved: number | null
    TimeInvolved: number | null
    Photos: string[]
    _count: SitediaryrecordsCountAggregateOutputType | null
    _avg: SitediaryrecordsAvgAggregateOutputType | null
    _sum: SitediaryrecordsSumAggregateOutputType | null
    _min: SitediaryrecordsMinAggregateOutputType | null
    _max: SitediaryrecordsMaxAggregateOutputType | null
  }

  type GetSitediaryrecordsGroupByPayload<T extends sitediaryrecordsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SitediaryrecordsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SitediaryrecordsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SitediaryrecordsGroupByOutputType[P]>
            : GetScalarType<T[P], SitediaryrecordsGroupByOutputType[P]>
        }
      >
    >


  export type sitediaryrecordsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    siteId?: boolean
    Date?: boolean
    Location?: boolean
    Works?: boolean
    Comments?: boolean
    Units?: boolean
    Amounts?: boolean
    WorkersInvolved?: boolean
    TimeInvolved?: boolean
    Photos?: boolean
    User?: boolean | sitediaryrecords$UserArgs<ExtArgs>
    Site?: boolean | sitediaryrecords$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["sitediaryrecords"]>

  export type sitediaryrecordsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    siteId?: boolean
    Date?: boolean
    Location?: boolean
    Works?: boolean
    Comments?: boolean
    Units?: boolean
    Amounts?: boolean
    WorkersInvolved?: boolean
    TimeInvolved?: boolean
    Photos?: boolean
    User?: boolean | sitediaryrecords$UserArgs<ExtArgs>
    Site?: boolean | sitediaryrecords$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["sitediaryrecords"]>

  export type sitediaryrecordsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    siteId?: boolean
    Date?: boolean
    Location?: boolean
    Works?: boolean
    Comments?: boolean
    Units?: boolean
    Amounts?: boolean
    WorkersInvolved?: boolean
    TimeInvolved?: boolean
    Photos?: boolean
    User?: boolean | sitediaryrecords$UserArgs<ExtArgs>
    Site?: boolean | sitediaryrecords$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["sitediaryrecords"]>

  export type sitediaryrecordsSelectScalar = {
    id?: boolean
    userId?: boolean
    siteId?: boolean
    Date?: boolean
    Location?: boolean
    Works?: boolean
    Comments?: boolean
    Units?: boolean
    Amounts?: boolean
    WorkersInvolved?: boolean
    TimeInvolved?: boolean
    Photos?: boolean
  }

  export type sitediaryrecordsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "siteId" | "Date" | "Location" | "Works" | "Comments" | "Units" | "Amounts" | "WorkersInvolved" | "TimeInvolved" | "Photos", ExtArgs["result"]["sitediaryrecords"]>
  export type sitediaryrecordsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | sitediaryrecords$UserArgs<ExtArgs>
    Site?: boolean | sitediaryrecords$SiteArgs<ExtArgs>
  }
  export type sitediaryrecordsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | sitediaryrecords$UserArgs<ExtArgs>
    Site?: boolean | sitediaryrecords$SiteArgs<ExtArgs>
  }
  export type sitediaryrecordsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | sitediaryrecords$UserArgs<ExtArgs>
    Site?: boolean | sitediaryrecords$SiteArgs<ExtArgs>
  }

  export type $sitediaryrecordsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "sitediaryrecords"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
      Site: Prisma.$SitePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      siteId: string | null
      Date: Date | null
      Location: string | null
      Works: string | null
      Comments: string | null
      Units: string | null
      Amounts: number | null
      WorkersInvolved: number | null
      TimeInvolved: number | null
      Photos: string[]
    }, ExtArgs["result"]["sitediaryrecords"]>
    composites: {}
  }

  type sitediaryrecordsGetPayload<S extends boolean | null | undefined | sitediaryrecordsDefaultArgs> = $Result.GetResult<Prisma.$sitediaryrecordsPayload, S>

  type sitediaryrecordsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<sitediaryrecordsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SitediaryrecordsCountAggregateInputType | true
    }

  export interface sitediaryrecordsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['sitediaryrecords'], meta: { name: 'sitediaryrecords' } }
    /**
     * Find zero or one Sitediaryrecords that matches the filter.
     * @param {sitediaryrecordsFindUniqueArgs} args - Arguments to find a Sitediaryrecords
     * @example
     * // Get one Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends sitediaryrecordsFindUniqueArgs>(args: SelectSubset<T, sitediaryrecordsFindUniqueArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Sitediaryrecords that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {sitediaryrecordsFindUniqueOrThrowArgs} args - Arguments to find a Sitediaryrecords
     * @example
     * // Get one Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends sitediaryrecordsFindUniqueOrThrowArgs>(args: SelectSubset<T, sitediaryrecordsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Sitediaryrecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediaryrecordsFindFirstArgs} args - Arguments to find a Sitediaryrecords
     * @example
     * // Get one Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends sitediaryrecordsFindFirstArgs>(args?: SelectSubset<T, sitediaryrecordsFindFirstArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Sitediaryrecords that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediaryrecordsFindFirstOrThrowArgs} args - Arguments to find a Sitediaryrecords
     * @example
     * // Get one Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends sitediaryrecordsFindFirstOrThrowArgs>(args?: SelectSubset<T, sitediaryrecordsFindFirstOrThrowArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sitediaryrecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediaryrecordsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.findMany()
     * 
     * // Get first 10 Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sitediaryrecordsWithIdOnly = await prisma.sitediaryrecords.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends sitediaryrecordsFindManyArgs>(args?: SelectSubset<T, sitediaryrecordsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Sitediaryrecords.
     * @param {sitediaryrecordsCreateArgs} args - Arguments to create a Sitediaryrecords.
     * @example
     * // Create one Sitediaryrecords
     * const Sitediaryrecords = await prisma.sitediaryrecords.create({
     *   data: {
     *     // ... data to create a Sitediaryrecords
     *   }
     * })
     * 
     */
    create<T extends sitediaryrecordsCreateArgs>(args: SelectSubset<T, sitediaryrecordsCreateArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sitediaryrecords.
     * @param {sitediaryrecordsCreateManyArgs} args - Arguments to create many Sitediaryrecords.
     * @example
     * // Create many Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends sitediaryrecordsCreateManyArgs>(args?: SelectSubset<T, sitediaryrecordsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sitediaryrecords and returns the data saved in the database.
     * @param {sitediaryrecordsCreateManyAndReturnArgs} args - Arguments to create many Sitediaryrecords.
     * @example
     * // Create many Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sitediaryrecords and only return the `id`
     * const sitediaryrecordsWithIdOnly = await prisma.sitediaryrecords.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends sitediaryrecordsCreateManyAndReturnArgs>(args?: SelectSubset<T, sitediaryrecordsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Sitediaryrecords.
     * @param {sitediaryrecordsDeleteArgs} args - Arguments to delete one Sitediaryrecords.
     * @example
     * // Delete one Sitediaryrecords
     * const Sitediaryrecords = await prisma.sitediaryrecords.delete({
     *   where: {
     *     // ... filter to delete one Sitediaryrecords
     *   }
     * })
     * 
     */
    delete<T extends sitediaryrecordsDeleteArgs>(args: SelectSubset<T, sitediaryrecordsDeleteArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Sitediaryrecords.
     * @param {sitediaryrecordsUpdateArgs} args - Arguments to update one Sitediaryrecords.
     * @example
     * // Update one Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends sitediaryrecordsUpdateArgs>(args: SelectSubset<T, sitediaryrecordsUpdateArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sitediaryrecords.
     * @param {sitediaryrecordsDeleteManyArgs} args - Arguments to filter Sitediaryrecords to delete.
     * @example
     * // Delete a few Sitediaryrecords
     * const { count } = await prisma.sitediaryrecords.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends sitediaryrecordsDeleteManyArgs>(args?: SelectSubset<T, sitediaryrecordsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sitediaryrecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediaryrecordsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends sitediaryrecordsUpdateManyArgs>(args: SelectSubset<T, sitediaryrecordsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sitediaryrecords and returns the data updated in the database.
     * @param {sitediaryrecordsUpdateManyAndReturnArgs} args - Arguments to update many Sitediaryrecords.
     * @example
     * // Update many Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sitediaryrecords and only return the `id`
     * const sitediaryrecordsWithIdOnly = await prisma.sitediaryrecords.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends sitediaryrecordsUpdateManyAndReturnArgs>(args: SelectSubset<T, sitediaryrecordsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Sitediaryrecords.
     * @param {sitediaryrecordsUpsertArgs} args - Arguments to update or create a Sitediaryrecords.
     * @example
     * // Update or create a Sitediaryrecords
     * const sitediaryrecords = await prisma.sitediaryrecords.upsert({
     *   create: {
     *     // ... data to create a Sitediaryrecords
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Sitediaryrecords we want to update
     *   }
     * })
     */
    upsert<T extends sitediaryrecordsUpsertArgs>(args: SelectSubset<T, sitediaryrecordsUpsertArgs<ExtArgs>>): Prisma__sitediaryrecordsClient<$Result.GetResult<Prisma.$sitediaryrecordsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sitediaryrecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediaryrecordsCountArgs} args - Arguments to filter Sitediaryrecords to count.
     * @example
     * // Count the number of Sitediaryrecords
     * const count = await prisma.sitediaryrecords.count({
     *   where: {
     *     // ... the filter for the Sitediaryrecords we want to count
     *   }
     * })
    **/
    count<T extends sitediaryrecordsCountArgs>(
      args?: Subset<T, sitediaryrecordsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SitediaryrecordsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Sitediaryrecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SitediaryrecordsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SitediaryrecordsAggregateArgs>(args: Subset<T, SitediaryrecordsAggregateArgs>): Prisma.PrismaPromise<GetSitediaryrecordsAggregateType<T>>

    /**
     * Group by Sitediaryrecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediaryrecordsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends sitediaryrecordsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: sitediaryrecordsGroupByArgs['orderBy'] }
        : { orderBy?: sitediaryrecordsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, sitediaryrecordsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSitediaryrecordsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the sitediaryrecords model
   */
  readonly fields: sitediaryrecordsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for sitediaryrecords.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__sitediaryrecordsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends sitediaryrecords$UserArgs<ExtArgs> = {}>(args?: Subset<T, sitediaryrecords$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    Site<T extends sitediaryrecords$SiteArgs<ExtArgs> = {}>(args?: Subset<T, sitediaryrecords$SiteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the sitediaryrecords model
   */
  interface sitediaryrecordsFieldRefs {
    readonly id: FieldRef<"sitediaryrecords", 'String'>
    readonly userId: FieldRef<"sitediaryrecords", 'String'>
    readonly siteId: FieldRef<"sitediaryrecords", 'String'>
    readonly Date: FieldRef<"sitediaryrecords", 'DateTime'>
    readonly Location: FieldRef<"sitediaryrecords", 'String'>
    readonly Works: FieldRef<"sitediaryrecords", 'String'>
    readonly Comments: FieldRef<"sitediaryrecords", 'String'>
    readonly Units: FieldRef<"sitediaryrecords", 'String'>
    readonly Amounts: FieldRef<"sitediaryrecords", 'Float'>
    readonly WorkersInvolved: FieldRef<"sitediaryrecords", 'Int'>
    readonly TimeInvolved: FieldRef<"sitediaryrecords", 'Float'>
    readonly Photos: FieldRef<"sitediaryrecords", 'String[]'>
  }
    

  // Custom InputTypes
  /**
   * sitediaryrecords findUnique
   */
  export type sitediaryrecordsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * Filter, which sitediaryrecords to fetch.
     */
    where: sitediaryrecordsWhereUniqueInput
  }

  /**
   * sitediaryrecords findUniqueOrThrow
   */
  export type sitediaryrecordsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * Filter, which sitediaryrecords to fetch.
     */
    where: sitediaryrecordsWhereUniqueInput
  }

  /**
   * sitediaryrecords findFirst
   */
  export type sitediaryrecordsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * Filter, which sitediaryrecords to fetch.
     */
    where?: sitediaryrecordsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediaryrecords to fetch.
     */
    orderBy?: sitediaryrecordsOrderByWithRelationInput | sitediaryrecordsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for sitediaryrecords.
     */
    cursor?: sitediaryrecordsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediaryrecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediaryrecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of sitediaryrecords.
     */
    distinct?: SitediaryrecordsScalarFieldEnum | SitediaryrecordsScalarFieldEnum[]
  }

  /**
   * sitediaryrecords findFirstOrThrow
   */
  export type sitediaryrecordsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * Filter, which sitediaryrecords to fetch.
     */
    where?: sitediaryrecordsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediaryrecords to fetch.
     */
    orderBy?: sitediaryrecordsOrderByWithRelationInput | sitediaryrecordsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for sitediaryrecords.
     */
    cursor?: sitediaryrecordsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediaryrecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediaryrecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of sitediaryrecords.
     */
    distinct?: SitediaryrecordsScalarFieldEnum | SitediaryrecordsScalarFieldEnum[]
  }

  /**
   * sitediaryrecords findMany
   */
  export type sitediaryrecordsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * Filter, which sitediaryrecords to fetch.
     */
    where?: sitediaryrecordsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediaryrecords to fetch.
     */
    orderBy?: sitediaryrecordsOrderByWithRelationInput | sitediaryrecordsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing sitediaryrecords.
     */
    cursor?: sitediaryrecordsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediaryrecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediaryrecords.
     */
    skip?: number
    distinct?: SitediaryrecordsScalarFieldEnum | SitediaryrecordsScalarFieldEnum[]
  }

  /**
   * sitediaryrecords create
   */
  export type sitediaryrecordsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * The data needed to create a sitediaryrecords.
     */
    data?: XOR<sitediaryrecordsCreateInput, sitediaryrecordsUncheckedCreateInput>
  }

  /**
   * sitediaryrecords createMany
   */
  export type sitediaryrecordsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many sitediaryrecords.
     */
    data: sitediaryrecordsCreateManyInput | sitediaryrecordsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * sitediaryrecords createManyAndReturn
   */
  export type sitediaryrecordsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * The data used to create many sitediaryrecords.
     */
    data: sitediaryrecordsCreateManyInput | sitediaryrecordsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * sitediaryrecords update
   */
  export type sitediaryrecordsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * The data needed to update a sitediaryrecords.
     */
    data: XOR<sitediaryrecordsUpdateInput, sitediaryrecordsUncheckedUpdateInput>
    /**
     * Choose, which sitediaryrecords to update.
     */
    where: sitediaryrecordsWhereUniqueInput
  }

  /**
   * sitediaryrecords updateMany
   */
  export type sitediaryrecordsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update sitediaryrecords.
     */
    data: XOR<sitediaryrecordsUpdateManyMutationInput, sitediaryrecordsUncheckedUpdateManyInput>
    /**
     * Filter which sitediaryrecords to update
     */
    where?: sitediaryrecordsWhereInput
    /**
     * Limit how many sitediaryrecords to update.
     */
    limit?: number
  }

  /**
   * sitediaryrecords updateManyAndReturn
   */
  export type sitediaryrecordsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * The data used to update sitediaryrecords.
     */
    data: XOR<sitediaryrecordsUpdateManyMutationInput, sitediaryrecordsUncheckedUpdateManyInput>
    /**
     * Filter which sitediaryrecords to update
     */
    where?: sitediaryrecordsWhereInput
    /**
     * Limit how many sitediaryrecords to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * sitediaryrecords upsert
   */
  export type sitediaryrecordsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * The filter to search for the sitediaryrecords to update in case it exists.
     */
    where: sitediaryrecordsWhereUniqueInput
    /**
     * In case the sitediaryrecords found by the `where` argument doesn't exist, create a new sitediaryrecords with this data.
     */
    create: XOR<sitediaryrecordsCreateInput, sitediaryrecordsUncheckedCreateInput>
    /**
     * In case the sitediaryrecords was found with the provided `where` argument, update it with this data.
     */
    update: XOR<sitediaryrecordsUpdateInput, sitediaryrecordsUncheckedUpdateInput>
  }

  /**
   * sitediaryrecords delete
   */
  export type sitediaryrecordsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
    /**
     * Filter which sitediaryrecords to delete.
     */
    where: sitediaryrecordsWhereUniqueInput
  }

  /**
   * sitediaryrecords deleteMany
   */
  export type sitediaryrecordsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which sitediaryrecords to delete
     */
    where?: sitediaryrecordsWhereInput
    /**
     * Limit how many sitediaryrecords to delete.
     */
    limit?: number
  }

  /**
   * sitediaryrecords.User
   */
  export type sitediaryrecords$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * sitediaryrecords.Site
   */
  export type sitediaryrecords$SiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
  }

  /**
   * sitediaryrecords without action
   */
  export type sitediaryrecordsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediaryrecords
     */
    select?: sitediaryrecordsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediaryrecords
     */
    omit?: sitediaryrecordsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediaryrecordsInclude<ExtArgs> | null
  }


  /**
   * Model sitediarysettings
   */

  export type AggregateSitediarysettings = {
    _count: SitediarysettingsCountAggregateOutputType | null
    _min: SitediarysettingsMinAggregateOutputType | null
    _max: SitediarysettingsMaxAggregateOutputType | null
  }

  export type SitediarysettingsMinAggregateOutputType = {
    id: string | null
    userId: string | null
    fileUrl: string | null
    siteId: string | null
    schema: string | null
  }

  export type SitediarysettingsMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    fileUrl: string | null
    siteId: string | null
    schema: string | null
  }

  export type SitediarysettingsCountAggregateOutputType = {
    id: number
    userId: number
    fileUrl: number
    siteId: number
    schema: number
    _all: number
  }


  export type SitediarysettingsMinAggregateInputType = {
    id?: true
    userId?: true
    fileUrl?: true
    siteId?: true
    schema?: true
  }

  export type SitediarysettingsMaxAggregateInputType = {
    id?: true
    userId?: true
    fileUrl?: true
    siteId?: true
    schema?: true
  }

  export type SitediarysettingsCountAggregateInputType = {
    id?: true
    userId?: true
    fileUrl?: true
    siteId?: true
    schema?: true
    _all?: true
  }

  export type SitediarysettingsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which sitediarysettings to aggregate.
     */
    where?: sitediarysettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediarysettings to fetch.
     */
    orderBy?: sitediarysettingsOrderByWithRelationInput | sitediarysettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: sitediarysettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediarysettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediarysettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned sitediarysettings
    **/
    _count?: true | SitediarysettingsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SitediarysettingsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SitediarysettingsMaxAggregateInputType
  }

  export type GetSitediarysettingsAggregateType<T extends SitediarysettingsAggregateArgs> = {
        [P in keyof T & keyof AggregateSitediarysettings]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSitediarysettings[P]>
      : GetScalarType<T[P], AggregateSitediarysettings[P]>
  }




  export type sitediarysettingsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: sitediarysettingsWhereInput
    orderBy?: sitediarysettingsOrderByWithAggregationInput | sitediarysettingsOrderByWithAggregationInput[]
    by: SitediarysettingsScalarFieldEnum[] | SitediarysettingsScalarFieldEnum
    having?: sitediarysettingsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SitediarysettingsCountAggregateInputType | true
    _min?: SitediarysettingsMinAggregateInputType
    _max?: SitediarysettingsMaxAggregateInputType
  }

  export type SitediarysettingsGroupByOutputType = {
    id: string
    userId: string | null
    fileUrl: string | null
    siteId: string | null
    schema: string | null
    _count: SitediarysettingsCountAggregateOutputType | null
    _min: SitediarysettingsMinAggregateOutputType | null
    _max: SitediarysettingsMaxAggregateOutputType | null
  }

  type GetSitediarysettingsGroupByPayload<T extends sitediarysettingsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SitediarysettingsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SitediarysettingsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SitediarysettingsGroupByOutputType[P]>
            : GetScalarType<T[P], SitediarysettingsGroupByOutputType[P]>
        }
      >
    >


  export type sitediarysettingsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fileUrl?: boolean
    siteId?: boolean
    schema?: boolean
    User?: boolean | sitediarysettings$UserArgs<ExtArgs>
    Site?: boolean | sitediarysettings$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["sitediarysettings"]>

  export type sitediarysettingsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fileUrl?: boolean
    siteId?: boolean
    schema?: boolean
    User?: boolean | sitediarysettings$UserArgs<ExtArgs>
    Site?: boolean | sitediarysettings$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["sitediarysettings"]>

  export type sitediarysettingsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    fileUrl?: boolean
    siteId?: boolean
    schema?: boolean
    User?: boolean | sitediarysettings$UserArgs<ExtArgs>
    Site?: boolean | sitediarysettings$SiteArgs<ExtArgs>
  }, ExtArgs["result"]["sitediarysettings"]>

  export type sitediarysettingsSelectScalar = {
    id?: boolean
    userId?: boolean
    fileUrl?: boolean
    siteId?: boolean
    schema?: boolean
  }

  export type sitediarysettingsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "fileUrl" | "siteId" | "schema", ExtArgs["result"]["sitediarysettings"]>
  export type sitediarysettingsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | sitediarysettings$UserArgs<ExtArgs>
    Site?: boolean | sitediarysettings$SiteArgs<ExtArgs>
  }
  export type sitediarysettingsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | sitediarysettings$UserArgs<ExtArgs>
    Site?: boolean | sitediarysettings$SiteArgs<ExtArgs>
  }
  export type sitediarysettingsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    User?: boolean | sitediarysettings$UserArgs<ExtArgs>
    Site?: boolean | sitediarysettings$SiteArgs<ExtArgs>
  }

  export type $sitediarysettingsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "sitediarysettings"
    objects: {
      User: Prisma.$UserPayload<ExtArgs> | null
      Site: Prisma.$SitePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string | null
      fileUrl: string | null
      siteId: string | null
      schema: string | null
    }, ExtArgs["result"]["sitediarysettings"]>
    composites: {}
  }

  type sitediarysettingsGetPayload<S extends boolean | null | undefined | sitediarysettingsDefaultArgs> = $Result.GetResult<Prisma.$sitediarysettingsPayload, S>

  type sitediarysettingsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<sitediarysettingsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SitediarysettingsCountAggregateInputType | true
    }

  export interface sitediarysettingsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['sitediarysettings'], meta: { name: 'sitediarysettings' } }
    /**
     * Find zero or one Sitediarysettings that matches the filter.
     * @param {sitediarysettingsFindUniqueArgs} args - Arguments to find a Sitediarysettings
     * @example
     * // Get one Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends sitediarysettingsFindUniqueArgs>(args: SelectSubset<T, sitediarysettingsFindUniqueArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Sitediarysettings that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {sitediarysettingsFindUniqueOrThrowArgs} args - Arguments to find a Sitediarysettings
     * @example
     * // Get one Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends sitediarysettingsFindUniqueOrThrowArgs>(args: SelectSubset<T, sitediarysettingsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Sitediarysettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediarysettingsFindFirstArgs} args - Arguments to find a Sitediarysettings
     * @example
     * // Get one Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends sitediarysettingsFindFirstArgs>(args?: SelectSubset<T, sitediarysettingsFindFirstArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Sitediarysettings that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediarysettingsFindFirstOrThrowArgs} args - Arguments to find a Sitediarysettings
     * @example
     * // Get one Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends sitediarysettingsFindFirstOrThrowArgs>(args?: SelectSubset<T, sitediarysettingsFindFirstOrThrowArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sitediarysettings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediarysettingsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.findMany()
     * 
     * // Get first 10 Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sitediarysettingsWithIdOnly = await prisma.sitediarysettings.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends sitediarysettingsFindManyArgs>(args?: SelectSubset<T, sitediarysettingsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Sitediarysettings.
     * @param {sitediarysettingsCreateArgs} args - Arguments to create a Sitediarysettings.
     * @example
     * // Create one Sitediarysettings
     * const Sitediarysettings = await prisma.sitediarysettings.create({
     *   data: {
     *     // ... data to create a Sitediarysettings
     *   }
     * })
     * 
     */
    create<T extends sitediarysettingsCreateArgs>(args: SelectSubset<T, sitediarysettingsCreateArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sitediarysettings.
     * @param {sitediarysettingsCreateManyArgs} args - Arguments to create many Sitediarysettings.
     * @example
     * // Create many Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends sitediarysettingsCreateManyArgs>(args?: SelectSubset<T, sitediarysettingsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sitediarysettings and returns the data saved in the database.
     * @param {sitediarysettingsCreateManyAndReturnArgs} args - Arguments to create many Sitediarysettings.
     * @example
     * // Create many Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sitediarysettings and only return the `id`
     * const sitediarysettingsWithIdOnly = await prisma.sitediarysettings.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends sitediarysettingsCreateManyAndReturnArgs>(args?: SelectSubset<T, sitediarysettingsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Sitediarysettings.
     * @param {sitediarysettingsDeleteArgs} args - Arguments to delete one Sitediarysettings.
     * @example
     * // Delete one Sitediarysettings
     * const Sitediarysettings = await prisma.sitediarysettings.delete({
     *   where: {
     *     // ... filter to delete one Sitediarysettings
     *   }
     * })
     * 
     */
    delete<T extends sitediarysettingsDeleteArgs>(args: SelectSubset<T, sitediarysettingsDeleteArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Sitediarysettings.
     * @param {sitediarysettingsUpdateArgs} args - Arguments to update one Sitediarysettings.
     * @example
     * // Update one Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends sitediarysettingsUpdateArgs>(args: SelectSubset<T, sitediarysettingsUpdateArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sitediarysettings.
     * @param {sitediarysettingsDeleteManyArgs} args - Arguments to filter Sitediarysettings to delete.
     * @example
     * // Delete a few Sitediarysettings
     * const { count } = await prisma.sitediarysettings.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends sitediarysettingsDeleteManyArgs>(args?: SelectSubset<T, sitediarysettingsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sitediarysettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediarysettingsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends sitediarysettingsUpdateManyArgs>(args: SelectSubset<T, sitediarysettingsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sitediarysettings and returns the data updated in the database.
     * @param {sitediarysettingsUpdateManyAndReturnArgs} args - Arguments to update many Sitediarysettings.
     * @example
     * // Update many Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sitediarysettings and only return the `id`
     * const sitediarysettingsWithIdOnly = await prisma.sitediarysettings.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends sitediarysettingsUpdateManyAndReturnArgs>(args: SelectSubset<T, sitediarysettingsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Sitediarysettings.
     * @param {sitediarysettingsUpsertArgs} args - Arguments to update or create a Sitediarysettings.
     * @example
     * // Update or create a Sitediarysettings
     * const sitediarysettings = await prisma.sitediarysettings.upsert({
     *   create: {
     *     // ... data to create a Sitediarysettings
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Sitediarysettings we want to update
     *   }
     * })
     */
    upsert<T extends sitediarysettingsUpsertArgs>(args: SelectSubset<T, sitediarysettingsUpsertArgs<ExtArgs>>): Prisma__sitediarysettingsClient<$Result.GetResult<Prisma.$sitediarysettingsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sitediarysettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediarysettingsCountArgs} args - Arguments to filter Sitediarysettings to count.
     * @example
     * // Count the number of Sitediarysettings
     * const count = await prisma.sitediarysettings.count({
     *   where: {
     *     // ... the filter for the Sitediarysettings we want to count
     *   }
     * })
    **/
    count<T extends sitediarysettingsCountArgs>(
      args?: Subset<T, sitediarysettingsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SitediarysettingsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Sitediarysettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SitediarysettingsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SitediarysettingsAggregateArgs>(args: Subset<T, SitediarysettingsAggregateArgs>): Prisma.PrismaPromise<GetSitediarysettingsAggregateType<T>>

    /**
     * Group by Sitediarysettings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sitediarysettingsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends sitediarysettingsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: sitediarysettingsGroupByArgs['orderBy'] }
        : { orderBy?: sitediarysettingsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, sitediarysettingsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSitediarysettingsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the sitediarysettings model
   */
  readonly fields: sitediarysettingsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for sitediarysettings.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__sitediarysettingsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    User<T extends sitediarysettings$UserArgs<ExtArgs> = {}>(args?: Subset<T, sitediarysettings$UserArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    Site<T extends sitediarysettings$SiteArgs<ExtArgs> = {}>(args?: Subset<T, sitediarysettings$SiteArgs<ExtArgs>>): Prisma__SiteClient<$Result.GetResult<Prisma.$SitePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the sitediarysettings model
   */
  interface sitediarysettingsFieldRefs {
    readonly id: FieldRef<"sitediarysettings", 'String'>
    readonly userId: FieldRef<"sitediarysettings", 'String'>
    readonly fileUrl: FieldRef<"sitediarysettings", 'String'>
    readonly siteId: FieldRef<"sitediarysettings", 'String'>
    readonly schema: FieldRef<"sitediarysettings", 'String'>
  }
    

  // Custom InputTypes
  /**
   * sitediarysettings findUnique
   */
  export type sitediarysettingsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * Filter, which sitediarysettings to fetch.
     */
    where: sitediarysettingsWhereUniqueInput
  }

  /**
   * sitediarysettings findUniqueOrThrow
   */
  export type sitediarysettingsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * Filter, which sitediarysettings to fetch.
     */
    where: sitediarysettingsWhereUniqueInput
  }

  /**
   * sitediarysettings findFirst
   */
  export type sitediarysettingsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * Filter, which sitediarysettings to fetch.
     */
    where?: sitediarysettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediarysettings to fetch.
     */
    orderBy?: sitediarysettingsOrderByWithRelationInput | sitediarysettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for sitediarysettings.
     */
    cursor?: sitediarysettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediarysettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediarysettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of sitediarysettings.
     */
    distinct?: SitediarysettingsScalarFieldEnum | SitediarysettingsScalarFieldEnum[]
  }

  /**
   * sitediarysettings findFirstOrThrow
   */
  export type sitediarysettingsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * Filter, which sitediarysettings to fetch.
     */
    where?: sitediarysettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediarysettings to fetch.
     */
    orderBy?: sitediarysettingsOrderByWithRelationInput | sitediarysettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for sitediarysettings.
     */
    cursor?: sitediarysettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediarysettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediarysettings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of sitediarysettings.
     */
    distinct?: SitediarysettingsScalarFieldEnum | SitediarysettingsScalarFieldEnum[]
  }

  /**
   * sitediarysettings findMany
   */
  export type sitediarysettingsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * Filter, which sitediarysettings to fetch.
     */
    where?: sitediarysettingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sitediarysettings to fetch.
     */
    orderBy?: sitediarysettingsOrderByWithRelationInput | sitediarysettingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing sitediarysettings.
     */
    cursor?: sitediarysettingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sitediarysettings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sitediarysettings.
     */
    skip?: number
    distinct?: SitediarysettingsScalarFieldEnum | SitediarysettingsScalarFieldEnum[]
  }

  /**
   * sitediarysettings create
   */
  export type sitediarysettingsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * The data needed to create a sitediarysettings.
     */
    data?: XOR<sitediarysettingsCreateInput, sitediarysettingsUncheckedCreateInput>
  }

  /**
   * sitediarysettings createMany
   */
  export type sitediarysettingsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many sitediarysettings.
     */
    data: sitediarysettingsCreateManyInput | sitediarysettingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * sitediarysettings createManyAndReturn
   */
  export type sitediarysettingsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * The data used to create many sitediarysettings.
     */
    data: sitediarysettingsCreateManyInput | sitediarysettingsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * sitediarysettings update
   */
  export type sitediarysettingsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * The data needed to update a sitediarysettings.
     */
    data: XOR<sitediarysettingsUpdateInput, sitediarysettingsUncheckedUpdateInput>
    /**
     * Choose, which sitediarysettings to update.
     */
    where: sitediarysettingsWhereUniqueInput
  }

  /**
   * sitediarysettings updateMany
   */
  export type sitediarysettingsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update sitediarysettings.
     */
    data: XOR<sitediarysettingsUpdateManyMutationInput, sitediarysettingsUncheckedUpdateManyInput>
    /**
     * Filter which sitediarysettings to update
     */
    where?: sitediarysettingsWhereInput
    /**
     * Limit how many sitediarysettings to update.
     */
    limit?: number
  }

  /**
   * sitediarysettings updateManyAndReturn
   */
  export type sitediarysettingsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * The data used to update sitediarysettings.
     */
    data: XOR<sitediarysettingsUpdateManyMutationInput, sitediarysettingsUncheckedUpdateManyInput>
    /**
     * Filter which sitediarysettings to update
     */
    where?: sitediarysettingsWhereInput
    /**
     * Limit how many sitediarysettings to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * sitediarysettings upsert
   */
  export type sitediarysettingsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * The filter to search for the sitediarysettings to update in case it exists.
     */
    where: sitediarysettingsWhereUniqueInput
    /**
     * In case the sitediarysettings found by the `where` argument doesn't exist, create a new sitediarysettings with this data.
     */
    create: XOR<sitediarysettingsCreateInput, sitediarysettingsUncheckedCreateInput>
    /**
     * In case the sitediarysettings was found with the provided `where` argument, update it with this data.
     */
    update: XOR<sitediarysettingsUpdateInput, sitediarysettingsUncheckedUpdateInput>
  }

  /**
   * sitediarysettings delete
   */
  export type sitediarysettingsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
    /**
     * Filter which sitediarysettings to delete.
     */
    where: sitediarysettingsWhereUniqueInput
  }

  /**
   * sitediarysettings deleteMany
   */
  export type sitediarysettingsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which sitediarysettings to delete
     */
    where?: sitediarysettingsWhereInput
    /**
     * Limit how many sitediarysettings to delete.
     */
    limit?: number
  }

  /**
   * sitediarysettings.User
   */
  export type sitediarysettings$UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * sitediarysettings.Site
   */
  export type sitediarysettings$SiteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Site
     */
    select?: SiteSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Site
     */
    omit?: SiteOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SiteInclude<ExtArgs> | null
    where?: SiteWhereInput
  }

  /**
   * sitediarysettings without action
   */
  export type sitediarysettingsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sitediarysettings
     */
    select?: sitediarysettingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sitediarysettings
     */
    omit?: sitediarysettingsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: sitediarysettingsInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
    profileImage: 'profileImage',
    customerId: 'customerId',
    createdAt: 'createdAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const SiteScalarFieldEnum: {
    id: 'id',
    name: 'name',
    description: 'description',
    subdirectory: 'subdirectory',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    imageUrl: 'imageUrl',
    userId: 'userId'
  };

  export type SiteScalarFieldEnum = (typeof SiteScalarFieldEnum)[keyof typeof SiteScalarFieldEnum]


  export const SubscriptionScalarFieldEnum: {
    stripeSubscriptionId: 'stripeSubscriptionId',
    interval: 'interval',
    status: 'status',
    planId: 'planId',
    currentPeriodStart: 'currentPeriodStart',
    currentPeriodEnd: 'currentPeriodEnd',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    userId: 'userId'
  };

  export type SubscriptionScalarFieldEnum = (typeof SubscriptionScalarFieldEnum)[keyof typeof SubscriptionScalarFieldEnum]


  export const InvoicesScalarFieldEnum: {
    id: 'id',
    url: 'url',
    invoiceNumber: 'invoiceNumber',
    sellerName: 'sellerName',
    invoiceTotalSumNoVat: 'invoiceTotalSumNoVat',
    invoiceTotalSumWithVat: 'invoiceTotalSumWithVat',
    buyerName: 'buyerName',
    invoiceDate: 'invoiceDate',
    paymentDate: 'paymentDate',
    isInvoice: 'isInvoice',
    isCreditDebitProformaOrAdvanced: 'isCreditDebitProformaOrAdvanced',
    uploadedAt: 'uploadedAt',
    userId: 'userId',
    SiteId: 'SiteId'
  };

  export type InvoicesScalarFieldEnum = (typeof InvoicesScalarFieldEnum)[keyof typeof InvoicesScalarFieldEnum]


  export const PostScalarFieldEnum: {
    id: 'id',
    title: 'title',
    articleContent: 'articleContent',
    smallDescription: 'smallDescription',
    image: 'image',
    slug: 'slug',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    userId: 'userId',
    siteId: 'siteId'
  };

  export type PostScalarFieldEnum = (typeof PostScalarFieldEnum)[keyof typeof PostScalarFieldEnum]


  export const InvoiceItemsScalarFieldEnum: {
    id: 'id',
    item: 'item',
    quantity: 'quantity',
    unitOfMeasure: 'unitOfMeasure',
    pricePerUnitOfMeasure: 'pricePerUnitOfMeasure',
    sum: 'sum',
    currency: 'currency',
    category: 'category',
    itemDescription: 'itemDescription',
    commentsForUser: 'commentsForUser',
    isInvoice: 'isInvoice',
    invoiceId: 'invoiceId',
    siteId: 'siteId',
    invoiceNumber: 'invoiceNumber',
    sellerName: 'sellerName',
    invoiceDate: 'invoiceDate',
    paymentDate: 'paymentDate'
  };

  export type InvoiceItemsScalarFieldEnum = (typeof InvoiceItemsScalarFieldEnum)[keyof typeof InvoiceItemsScalarFieldEnum]


  export const AIconversationScalarFieldEnum: {
    id: 'id',
    thread: 'thread',
    userId: 'userId',
    siteId: 'siteId'
  };

  export type AIconversationScalarFieldEnum = (typeof AIconversationScalarFieldEnum)[keyof typeof AIconversationScalarFieldEnum]


  export const DocumentsScalarFieldEnum: {
    id: 'id',
    url: 'url',
    documentType: 'documentType',
    documentName: 'documentName',
    description: 'description',
    userId: 'userId',
    siteId: 'siteId'
  };

  export type DocumentsScalarFieldEnum = (typeof DocumentsScalarFieldEnum)[keyof typeof DocumentsScalarFieldEnum]


  export const SitediaryrecordsScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    siteId: 'siteId',
    Date: 'Date',
    Location: 'Location',
    Works: 'Works',
    Comments: 'Comments',
    Units: 'Units',
    Amounts: 'Amounts',
    WorkersInvolved: 'WorkersInvolved',
    TimeInvolved: 'TimeInvolved',
    Photos: 'Photos'
  };

  export type SitediaryrecordsScalarFieldEnum = (typeof SitediaryrecordsScalarFieldEnum)[keyof typeof SitediaryrecordsScalarFieldEnum]


  export const SitediarysettingsScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    fileUrl: 'fileUrl',
    siteId: 'siteId',
    schema: 'schema'
  };

  export type SitediarysettingsScalarFieldEnum = (typeof SitediarysettingsScalarFieldEnum)[keyof typeof SitediarysettingsScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    firstName?: StringFilter<"User"> | string
    lastName?: StringFilter<"User"> | string
    profileImage?: StringFilter<"User"> | string
    customerId?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    Site?: SiteListRelationFilter
    posts?: PostListRelationFilter
    Invoices?: InvoicesListRelationFilter
    Documents?: DocumentsListRelationFilter
    sitediaryrecords?: SitediaryrecordsListRelationFilter
    Subscription?: XOR<SubscriptionNullableScalarRelationFilter, SubscriptionWhereInput> | null
    AIconversation?: AIconversationListRelationFilter
    sitediarysettings?: SitediarysettingsListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    profileImage?: SortOrder
    customerId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    Site?: SiteOrderByRelationAggregateInput
    posts?: PostOrderByRelationAggregateInput
    Invoices?: InvoicesOrderByRelationAggregateInput
    Documents?: DocumentsOrderByRelationAggregateInput
    sitediaryrecords?: sitediaryrecordsOrderByRelationAggregateInput
    Subscription?: SubscriptionOrderByWithRelationInput
    AIconversation?: AIconversationOrderByRelationAggregateInput
    sitediarysettings?: sitediarysettingsOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    customerId?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    email?: StringFilter<"User"> | string
    firstName?: StringFilter<"User"> | string
    lastName?: StringFilter<"User"> | string
    profileImage?: StringFilter<"User"> | string
    createdAt?: DateTimeFilter<"User"> | Date | string
    Site?: SiteListRelationFilter
    posts?: PostListRelationFilter
    Invoices?: InvoicesListRelationFilter
    Documents?: DocumentsListRelationFilter
    sitediaryrecords?: SitediaryrecordsListRelationFilter
    Subscription?: XOR<SubscriptionNullableScalarRelationFilter, SubscriptionWhereInput> | null
    AIconversation?: AIconversationListRelationFilter
    sitediarysettings?: SitediarysettingsListRelationFilter
  }, "id" | "id" | "customerId">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    profileImage?: SortOrder
    customerId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    firstName?: StringWithAggregatesFilter<"User"> | string
    lastName?: StringWithAggregatesFilter<"User"> | string
    profileImage?: StringWithAggregatesFilter<"User"> | string
    customerId?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type SiteWhereInput = {
    AND?: SiteWhereInput | SiteWhereInput[]
    OR?: SiteWhereInput[]
    NOT?: SiteWhereInput | SiteWhereInput[]
    id?: StringFilter<"Site"> | string
    name?: StringFilter<"Site"> | string
    description?: StringFilter<"Site"> | string
    subdirectory?: StringFilter<"Site"> | string
    createdAt?: DateTimeFilter<"Site"> | Date | string
    updatedAt?: DateTimeFilter<"Site"> | Date | string
    imageUrl?: StringNullableFilter<"Site"> | string | null
    userId?: StringNullableFilter<"Site"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    posts?: PostListRelationFilter
    invoices?: InvoicesListRelationFilter
    InvoiceItems?: InvoiceItemsListRelationFilter
    Documents?: DocumentsListRelationFilter
    sitediaryrecords?: SitediaryrecordsListRelationFilter
    AIconversation?: XOR<AIconversationNullableScalarRelationFilter, AIconversationWhereInput> | null
    sitediarysettings?: XOR<SitediarysettingsNullableScalarRelationFilter, sitediarysettingsWhereInput> | null
  }

  export type SiteOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    subdirectory?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    imageUrl?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    User?: UserOrderByWithRelationInput
    posts?: PostOrderByRelationAggregateInput
    invoices?: InvoicesOrderByRelationAggregateInput
    InvoiceItems?: InvoiceItemsOrderByRelationAggregateInput
    Documents?: DocumentsOrderByRelationAggregateInput
    sitediaryrecords?: sitediaryrecordsOrderByRelationAggregateInput
    AIconversation?: AIconversationOrderByWithRelationInput
    sitediarysettings?: sitediarysettingsOrderByWithRelationInput
  }

  export type SiteWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SiteWhereInput | SiteWhereInput[]
    OR?: SiteWhereInput[]
    NOT?: SiteWhereInput | SiteWhereInput[]
    name?: StringFilter<"Site"> | string
    description?: StringFilter<"Site"> | string
    subdirectory?: StringFilter<"Site"> | string
    createdAt?: DateTimeFilter<"Site"> | Date | string
    updatedAt?: DateTimeFilter<"Site"> | Date | string
    imageUrl?: StringNullableFilter<"Site"> | string | null
    userId?: StringNullableFilter<"Site"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    posts?: PostListRelationFilter
    invoices?: InvoicesListRelationFilter
    InvoiceItems?: InvoiceItemsListRelationFilter
    Documents?: DocumentsListRelationFilter
    sitediaryrecords?: SitediaryrecordsListRelationFilter
    AIconversation?: XOR<AIconversationNullableScalarRelationFilter, AIconversationWhereInput> | null
    sitediarysettings?: XOR<SitediarysettingsNullableScalarRelationFilter, sitediarysettingsWhereInput> | null
  }, "id">

  export type SiteOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    subdirectory?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    imageUrl?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    _count?: SiteCountOrderByAggregateInput
    _max?: SiteMaxOrderByAggregateInput
    _min?: SiteMinOrderByAggregateInput
  }

  export type SiteScalarWhereWithAggregatesInput = {
    AND?: SiteScalarWhereWithAggregatesInput | SiteScalarWhereWithAggregatesInput[]
    OR?: SiteScalarWhereWithAggregatesInput[]
    NOT?: SiteScalarWhereWithAggregatesInput | SiteScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Site"> | string
    name?: StringWithAggregatesFilter<"Site"> | string
    description?: StringWithAggregatesFilter<"Site"> | string
    subdirectory?: StringWithAggregatesFilter<"Site"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Site"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Site"> | Date | string
    imageUrl?: StringNullableWithAggregatesFilter<"Site"> | string | null
    userId?: StringNullableWithAggregatesFilter<"Site"> | string | null
  }

  export type SubscriptionWhereInput = {
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    stripeSubscriptionId?: StringFilter<"Subscription"> | string
    interval?: StringFilter<"Subscription"> | string
    status?: StringFilter<"Subscription"> | string
    planId?: StringFilter<"Subscription"> | string
    currentPeriodStart?: IntFilter<"Subscription"> | number
    currentPeriodEnd?: IntFilter<"Subscription"> | number
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    userId?: StringNullableFilter<"Subscription"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type SubscriptionOrderByWithRelationInput = {
    stripeSubscriptionId?: SortOrder
    interval?: SortOrder
    status?: SortOrder
    planId?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    User?: UserOrderByWithRelationInput
  }

  export type SubscriptionWhereUniqueInput = Prisma.AtLeast<{
    stripeSubscriptionId?: string
    userId?: string
    AND?: SubscriptionWhereInput | SubscriptionWhereInput[]
    OR?: SubscriptionWhereInput[]
    NOT?: SubscriptionWhereInput | SubscriptionWhereInput[]
    interval?: StringFilter<"Subscription"> | string
    status?: StringFilter<"Subscription"> | string
    planId?: StringFilter<"Subscription"> | string
    currentPeriodStart?: IntFilter<"Subscription"> | number
    currentPeriodEnd?: IntFilter<"Subscription"> | number
    createdAt?: DateTimeFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeFilter<"Subscription"> | Date | string
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "stripeSubscriptionId" | "stripeSubscriptionId" | "userId">

  export type SubscriptionOrderByWithAggregationInput = {
    stripeSubscriptionId?: SortOrder
    interval?: SortOrder
    status?: SortOrder
    planId?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    _count?: SubscriptionCountOrderByAggregateInput
    _avg?: SubscriptionAvgOrderByAggregateInput
    _max?: SubscriptionMaxOrderByAggregateInput
    _min?: SubscriptionMinOrderByAggregateInput
    _sum?: SubscriptionSumOrderByAggregateInput
  }

  export type SubscriptionScalarWhereWithAggregatesInput = {
    AND?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    OR?: SubscriptionScalarWhereWithAggregatesInput[]
    NOT?: SubscriptionScalarWhereWithAggregatesInput | SubscriptionScalarWhereWithAggregatesInput[]
    stripeSubscriptionId?: StringWithAggregatesFilter<"Subscription"> | string
    interval?: StringWithAggregatesFilter<"Subscription"> | string
    status?: StringWithAggregatesFilter<"Subscription"> | string
    planId?: StringWithAggregatesFilter<"Subscription"> | string
    currentPeriodStart?: IntWithAggregatesFilter<"Subscription"> | number
    currentPeriodEnd?: IntWithAggregatesFilter<"Subscription"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Subscription"> | Date | string
    userId?: StringNullableWithAggregatesFilter<"Subscription"> | string | null
  }

  export type InvoicesWhereInput = {
    AND?: InvoicesWhereInput | InvoicesWhereInput[]
    OR?: InvoicesWhereInput[]
    NOT?: InvoicesWhereInput | InvoicesWhereInput[]
    id?: StringFilter<"Invoices"> | string
    url?: StringFilter<"Invoices"> | string
    invoiceNumber?: StringNullableFilter<"Invoices"> | string | null
    sellerName?: StringNullableFilter<"Invoices"> | string | null
    invoiceTotalSumNoVat?: FloatNullableFilter<"Invoices"> | number | null
    invoiceTotalSumWithVat?: FloatNullableFilter<"Invoices"> | number | null
    buyerName?: StringNullableFilter<"Invoices"> | string | null
    invoiceDate?: StringNullableFilter<"Invoices"> | string | null
    paymentDate?: StringNullableFilter<"Invoices"> | string | null
    isInvoice?: BoolNullableFilter<"Invoices"> | boolean | null
    isCreditDebitProformaOrAdvanced?: StringNullableFilter<"Invoices"> | string | null
    uploadedAt?: DateTimeFilter<"Invoices"> | Date | string
    userId?: StringNullableFilter<"Invoices"> | string | null
    SiteId?: StringNullableFilter<"Invoices"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
    items?: InvoiceItemsListRelationFilter
  }

  export type InvoicesOrderByWithRelationInput = {
    id?: SortOrder
    url?: SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    sellerName?: SortOrderInput | SortOrder
    invoiceTotalSumNoVat?: SortOrderInput | SortOrder
    invoiceTotalSumWithVat?: SortOrderInput | SortOrder
    buyerName?: SortOrderInput | SortOrder
    invoiceDate?: SortOrderInput | SortOrder
    paymentDate?: SortOrderInput | SortOrder
    isInvoice?: SortOrderInput | SortOrder
    isCreditDebitProformaOrAdvanced?: SortOrderInput | SortOrder
    uploadedAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    SiteId?: SortOrderInput | SortOrder
    User?: UserOrderByWithRelationInput
    Site?: SiteOrderByWithRelationInput
    items?: InvoiceItemsOrderByRelationAggregateInput
  }

  export type InvoicesWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InvoicesWhereInput | InvoicesWhereInput[]
    OR?: InvoicesWhereInput[]
    NOT?: InvoicesWhereInput | InvoicesWhereInput[]
    url?: StringFilter<"Invoices"> | string
    invoiceNumber?: StringNullableFilter<"Invoices"> | string | null
    sellerName?: StringNullableFilter<"Invoices"> | string | null
    invoiceTotalSumNoVat?: FloatNullableFilter<"Invoices"> | number | null
    invoiceTotalSumWithVat?: FloatNullableFilter<"Invoices"> | number | null
    buyerName?: StringNullableFilter<"Invoices"> | string | null
    invoiceDate?: StringNullableFilter<"Invoices"> | string | null
    paymentDate?: StringNullableFilter<"Invoices"> | string | null
    isInvoice?: BoolNullableFilter<"Invoices"> | boolean | null
    isCreditDebitProformaOrAdvanced?: StringNullableFilter<"Invoices"> | string | null
    uploadedAt?: DateTimeFilter<"Invoices"> | Date | string
    userId?: StringNullableFilter<"Invoices"> | string | null
    SiteId?: StringNullableFilter<"Invoices"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
    items?: InvoiceItemsListRelationFilter
  }, "id">

  export type InvoicesOrderByWithAggregationInput = {
    id?: SortOrder
    url?: SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    sellerName?: SortOrderInput | SortOrder
    invoiceTotalSumNoVat?: SortOrderInput | SortOrder
    invoiceTotalSumWithVat?: SortOrderInput | SortOrder
    buyerName?: SortOrderInput | SortOrder
    invoiceDate?: SortOrderInput | SortOrder
    paymentDate?: SortOrderInput | SortOrder
    isInvoice?: SortOrderInput | SortOrder
    isCreditDebitProformaOrAdvanced?: SortOrderInput | SortOrder
    uploadedAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    SiteId?: SortOrderInput | SortOrder
    _count?: InvoicesCountOrderByAggregateInput
    _avg?: InvoicesAvgOrderByAggregateInput
    _max?: InvoicesMaxOrderByAggregateInput
    _min?: InvoicesMinOrderByAggregateInput
    _sum?: InvoicesSumOrderByAggregateInput
  }

  export type InvoicesScalarWhereWithAggregatesInput = {
    AND?: InvoicesScalarWhereWithAggregatesInput | InvoicesScalarWhereWithAggregatesInput[]
    OR?: InvoicesScalarWhereWithAggregatesInput[]
    NOT?: InvoicesScalarWhereWithAggregatesInput | InvoicesScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Invoices"> | string
    url?: StringWithAggregatesFilter<"Invoices"> | string
    invoiceNumber?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
    sellerName?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
    invoiceTotalSumNoVat?: FloatNullableWithAggregatesFilter<"Invoices"> | number | null
    invoiceTotalSumWithVat?: FloatNullableWithAggregatesFilter<"Invoices"> | number | null
    buyerName?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
    invoiceDate?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
    paymentDate?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
    isInvoice?: BoolNullableWithAggregatesFilter<"Invoices"> | boolean | null
    isCreditDebitProformaOrAdvanced?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
    uploadedAt?: DateTimeWithAggregatesFilter<"Invoices"> | Date | string
    userId?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
    SiteId?: StringNullableWithAggregatesFilter<"Invoices"> | string | null
  }

  export type PostWhereInput = {
    AND?: PostWhereInput | PostWhereInput[]
    OR?: PostWhereInput[]
    NOT?: PostWhereInput | PostWhereInput[]
    id?: StringFilter<"Post"> | string
    title?: StringFilter<"Post"> | string
    articleContent?: JsonFilter<"Post">
    smallDescription?: StringFilter<"Post"> | string
    image?: StringFilter<"Post"> | string
    slug?: StringFilter<"Post"> | string
    createdAt?: DateTimeFilter<"Post"> | Date | string
    updatedAt?: DateTimeFilter<"Post"> | Date | string
    userId?: StringNullableFilter<"Post"> | string | null
    siteId?: StringNullableFilter<"Post"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }

  export type PostOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    articleContent?: SortOrder
    smallDescription?: SortOrder
    image?: SortOrder
    slug?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    User?: UserOrderByWithRelationInput
    Site?: SiteOrderByWithRelationInput
  }

  export type PostWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    AND?: PostWhereInput | PostWhereInput[]
    OR?: PostWhereInput[]
    NOT?: PostWhereInput | PostWhereInput[]
    title?: StringFilter<"Post"> | string
    articleContent?: JsonFilter<"Post">
    smallDescription?: StringFilter<"Post"> | string
    image?: StringFilter<"Post"> | string
    createdAt?: DateTimeFilter<"Post"> | Date | string
    updatedAt?: DateTimeFilter<"Post"> | Date | string
    userId?: StringNullableFilter<"Post"> | string | null
    siteId?: StringNullableFilter<"Post"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }, "id" | "slug">

  export type PostOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    articleContent?: SortOrder
    smallDescription?: SortOrder
    image?: SortOrder
    slug?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    _count?: PostCountOrderByAggregateInput
    _max?: PostMaxOrderByAggregateInput
    _min?: PostMinOrderByAggregateInput
  }

  export type PostScalarWhereWithAggregatesInput = {
    AND?: PostScalarWhereWithAggregatesInput | PostScalarWhereWithAggregatesInput[]
    OR?: PostScalarWhereWithAggregatesInput[]
    NOT?: PostScalarWhereWithAggregatesInput | PostScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Post"> | string
    title?: StringWithAggregatesFilter<"Post"> | string
    articleContent?: JsonWithAggregatesFilter<"Post">
    smallDescription?: StringWithAggregatesFilter<"Post"> | string
    image?: StringWithAggregatesFilter<"Post"> | string
    slug?: StringWithAggregatesFilter<"Post"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Post"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Post"> | Date | string
    userId?: StringNullableWithAggregatesFilter<"Post"> | string | null
    siteId?: StringNullableWithAggregatesFilter<"Post"> | string | null
  }

  export type InvoiceItemsWhereInput = {
    AND?: InvoiceItemsWhereInput | InvoiceItemsWhereInput[]
    OR?: InvoiceItemsWhereInput[]
    NOT?: InvoiceItemsWhereInput | InvoiceItemsWhereInput[]
    id?: StringFilter<"InvoiceItems"> | string
    item?: StringNullableFilter<"InvoiceItems"> | string | null
    quantity?: FloatNullableFilter<"InvoiceItems"> | number | null
    unitOfMeasure?: StringNullableFilter<"InvoiceItems"> | string | null
    pricePerUnitOfMeasure?: FloatNullableFilter<"InvoiceItems"> | number | null
    sum?: FloatNullableFilter<"InvoiceItems"> | number | null
    currency?: StringNullableFilter<"InvoiceItems"> | string | null
    category?: StringNullableFilter<"InvoiceItems"> | string | null
    itemDescription?: StringNullableFilter<"InvoiceItems"> | string | null
    commentsForUser?: StringNullableFilter<"InvoiceItems"> | string | null
    isInvoice?: BoolNullableFilter<"InvoiceItems"> | boolean | null
    invoiceId?: StringFilter<"InvoiceItems"> | string
    siteId?: StringNullableFilter<"InvoiceItems"> | string | null
    invoiceNumber?: StringNullableFilter<"InvoiceItems"> | string | null
    sellerName?: StringNullableFilter<"InvoiceItems"> | string | null
    invoiceDate?: StringNullableFilter<"InvoiceItems"> | string | null
    paymentDate?: StringNullableFilter<"InvoiceItems"> | string | null
    invoice?: XOR<InvoicesScalarRelationFilter, InvoicesWhereInput>
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }

  export type InvoiceItemsOrderByWithRelationInput = {
    id?: SortOrder
    item?: SortOrderInput | SortOrder
    quantity?: SortOrderInput | SortOrder
    unitOfMeasure?: SortOrderInput | SortOrder
    pricePerUnitOfMeasure?: SortOrderInput | SortOrder
    sum?: SortOrderInput | SortOrder
    currency?: SortOrderInput | SortOrder
    category?: SortOrderInput | SortOrder
    itemDescription?: SortOrderInput | SortOrder
    commentsForUser?: SortOrderInput | SortOrder
    isInvoice?: SortOrderInput | SortOrder
    invoiceId?: SortOrder
    siteId?: SortOrderInput | SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    sellerName?: SortOrderInput | SortOrder
    invoiceDate?: SortOrderInput | SortOrder
    paymentDate?: SortOrderInput | SortOrder
    invoice?: InvoicesOrderByWithRelationInput
    Site?: SiteOrderByWithRelationInput
  }

  export type InvoiceItemsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: InvoiceItemsWhereInput | InvoiceItemsWhereInput[]
    OR?: InvoiceItemsWhereInput[]
    NOT?: InvoiceItemsWhereInput | InvoiceItemsWhereInput[]
    item?: StringNullableFilter<"InvoiceItems"> | string | null
    quantity?: FloatNullableFilter<"InvoiceItems"> | number | null
    unitOfMeasure?: StringNullableFilter<"InvoiceItems"> | string | null
    pricePerUnitOfMeasure?: FloatNullableFilter<"InvoiceItems"> | number | null
    sum?: FloatNullableFilter<"InvoiceItems"> | number | null
    currency?: StringNullableFilter<"InvoiceItems"> | string | null
    category?: StringNullableFilter<"InvoiceItems"> | string | null
    itemDescription?: StringNullableFilter<"InvoiceItems"> | string | null
    commentsForUser?: StringNullableFilter<"InvoiceItems"> | string | null
    isInvoice?: BoolNullableFilter<"InvoiceItems"> | boolean | null
    invoiceId?: StringFilter<"InvoiceItems"> | string
    siteId?: StringNullableFilter<"InvoiceItems"> | string | null
    invoiceNumber?: StringNullableFilter<"InvoiceItems"> | string | null
    sellerName?: StringNullableFilter<"InvoiceItems"> | string | null
    invoiceDate?: StringNullableFilter<"InvoiceItems"> | string | null
    paymentDate?: StringNullableFilter<"InvoiceItems"> | string | null
    invoice?: XOR<InvoicesScalarRelationFilter, InvoicesWhereInput>
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }, "id">

  export type InvoiceItemsOrderByWithAggregationInput = {
    id?: SortOrder
    item?: SortOrderInput | SortOrder
    quantity?: SortOrderInput | SortOrder
    unitOfMeasure?: SortOrderInput | SortOrder
    pricePerUnitOfMeasure?: SortOrderInput | SortOrder
    sum?: SortOrderInput | SortOrder
    currency?: SortOrderInput | SortOrder
    category?: SortOrderInput | SortOrder
    itemDescription?: SortOrderInput | SortOrder
    commentsForUser?: SortOrderInput | SortOrder
    isInvoice?: SortOrderInput | SortOrder
    invoiceId?: SortOrder
    siteId?: SortOrderInput | SortOrder
    invoiceNumber?: SortOrderInput | SortOrder
    sellerName?: SortOrderInput | SortOrder
    invoiceDate?: SortOrderInput | SortOrder
    paymentDate?: SortOrderInput | SortOrder
    _count?: InvoiceItemsCountOrderByAggregateInput
    _avg?: InvoiceItemsAvgOrderByAggregateInput
    _max?: InvoiceItemsMaxOrderByAggregateInput
    _min?: InvoiceItemsMinOrderByAggregateInput
    _sum?: InvoiceItemsSumOrderByAggregateInput
  }

  export type InvoiceItemsScalarWhereWithAggregatesInput = {
    AND?: InvoiceItemsScalarWhereWithAggregatesInput | InvoiceItemsScalarWhereWithAggregatesInput[]
    OR?: InvoiceItemsScalarWhereWithAggregatesInput[]
    NOT?: InvoiceItemsScalarWhereWithAggregatesInput | InvoiceItemsScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"InvoiceItems"> | string
    item?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    quantity?: FloatNullableWithAggregatesFilter<"InvoiceItems"> | number | null
    unitOfMeasure?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    pricePerUnitOfMeasure?: FloatNullableWithAggregatesFilter<"InvoiceItems"> | number | null
    sum?: FloatNullableWithAggregatesFilter<"InvoiceItems"> | number | null
    currency?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    category?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    itemDescription?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    commentsForUser?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    isInvoice?: BoolNullableWithAggregatesFilter<"InvoiceItems"> | boolean | null
    invoiceId?: StringWithAggregatesFilter<"InvoiceItems"> | string
    siteId?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    invoiceNumber?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    sellerName?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    invoiceDate?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
    paymentDate?: StringNullableWithAggregatesFilter<"InvoiceItems"> | string | null
  }

  export type AIconversationWhereInput = {
    AND?: AIconversationWhereInput | AIconversationWhereInput[]
    OR?: AIconversationWhereInput[]
    NOT?: AIconversationWhereInput | AIconversationWhereInput[]
    id?: StringFilter<"AIconversation"> | string
    thread?: JsonNullableFilter<"AIconversation">
    userId?: StringFilter<"AIconversation"> | string
    siteId?: StringFilter<"AIconversation"> | string
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }

  export type AIconversationOrderByWithRelationInput = {
    id?: SortOrder
    thread?: SortOrderInput | SortOrder
    userId?: SortOrder
    siteId?: SortOrder
    User?: UserOrderByWithRelationInput
    site?: SiteOrderByWithRelationInput
  }

  export type AIconversationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    siteId?: string
    userId_siteId?: AIconversationUserIdSiteIdCompoundUniqueInput
    AND?: AIconversationWhereInput | AIconversationWhereInput[]
    OR?: AIconversationWhereInput[]
    NOT?: AIconversationWhereInput | AIconversationWhereInput[]
    thread?: JsonNullableFilter<"AIconversation">
    userId?: StringFilter<"AIconversation"> | string
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }, "id" | "siteId" | "userId_siteId">

  export type AIconversationOrderByWithAggregationInput = {
    id?: SortOrder
    thread?: SortOrderInput | SortOrder
    userId?: SortOrder
    siteId?: SortOrder
    _count?: AIconversationCountOrderByAggregateInput
    _max?: AIconversationMaxOrderByAggregateInput
    _min?: AIconversationMinOrderByAggregateInput
  }

  export type AIconversationScalarWhereWithAggregatesInput = {
    AND?: AIconversationScalarWhereWithAggregatesInput | AIconversationScalarWhereWithAggregatesInput[]
    OR?: AIconversationScalarWhereWithAggregatesInput[]
    NOT?: AIconversationScalarWhereWithAggregatesInput | AIconversationScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AIconversation"> | string
    thread?: JsonNullableWithAggregatesFilter<"AIconversation">
    userId?: StringWithAggregatesFilter<"AIconversation"> | string
    siteId?: StringWithAggregatesFilter<"AIconversation"> | string
  }

  export type DocumentsWhereInput = {
    AND?: DocumentsWhereInput | DocumentsWhereInput[]
    OR?: DocumentsWhereInput[]
    NOT?: DocumentsWhereInput | DocumentsWhereInput[]
    id?: StringFilter<"Documents"> | string
    url?: StringFilter<"Documents"> | string
    documentType?: StringFilter<"Documents"> | string
    documentName?: StringFilter<"Documents"> | string
    description?: StringFilter<"Documents"> | string
    userId?: StringNullableFilter<"Documents"> | string | null
    siteId?: StringNullableFilter<"Documents"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }

  export type DocumentsOrderByWithRelationInput = {
    id?: SortOrder
    url?: SortOrder
    documentType?: SortOrder
    documentName?: SortOrder
    description?: SortOrder
    userId?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    User?: UserOrderByWithRelationInput
    Site?: SiteOrderByWithRelationInput
  }

  export type DocumentsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: DocumentsWhereInput | DocumentsWhereInput[]
    OR?: DocumentsWhereInput[]
    NOT?: DocumentsWhereInput | DocumentsWhereInput[]
    url?: StringFilter<"Documents"> | string
    documentType?: StringFilter<"Documents"> | string
    documentName?: StringFilter<"Documents"> | string
    description?: StringFilter<"Documents"> | string
    userId?: StringNullableFilter<"Documents"> | string | null
    siteId?: StringNullableFilter<"Documents"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }, "id">

  export type DocumentsOrderByWithAggregationInput = {
    id?: SortOrder
    url?: SortOrder
    documentType?: SortOrder
    documentName?: SortOrder
    description?: SortOrder
    userId?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    _count?: DocumentsCountOrderByAggregateInput
    _max?: DocumentsMaxOrderByAggregateInput
    _min?: DocumentsMinOrderByAggregateInput
  }

  export type DocumentsScalarWhereWithAggregatesInput = {
    AND?: DocumentsScalarWhereWithAggregatesInput | DocumentsScalarWhereWithAggregatesInput[]
    OR?: DocumentsScalarWhereWithAggregatesInput[]
    NOT?: DocumentsScalarWhereWithAggregatesInput | DocumentsScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Documents"> | string
    url?: StringWithAggregatesFilter<"Documents"> | string
    documentType?: StringWithAggregatesFilter<"Documents"> | string
    documentName?: StringWithAggregatesFilter<"Documents"> | string
    description?: StringWithAggregatesFilter<"Documents"> | string
    userId?: StringNullableWithAggregatesFilter<"Documents"> | string | null
    siteId?: StringNullableWithAggregatesFilter<"Documents"> | string | null
  }

  export type sitediaryrecordsWhereInput = {
    AND?: sitediaryrecordsWhereInput | sitediaryrecordsWhereInput[]
    OR?: sitediaryrecordsWhereInput[]
    NOT?: sitediaryrecordsWhereInput | sitediaryrecordsWhereInput[]
    id?: StringFilter<"sitediaryrecords"> | string
    userId?: StringNullableFilter<"sitediaryrecords"> | string | null
    siteId?: StringNullableFilter<"sitediaryrecords"> | string | null
    Date?: DateTimeNullableFilter<"sitediaryrecords"> | Date | string | null
    Location?: StringNullableFilter<"sitediaryrecords"> | string | null
    Works?: StringNullableFilter<"sitediaryrecords"> | string | null
    Comments?: StringNullableFilter<"sitediaryrecords"> | string | null
    Units?: StringNullableFilter<"sitediaryrecords"> | string | null
    Amounts?: FloatNullableFilter<"sitediaryrecords"> | number | null
    WorkersInvolved?: IntNullableFilter<"sitediaryrecords"> | number | null
    TimeInvolved?: FloatNullableFilter<"sitediaryrecords"> | number | null
    Photos?: StringNullableListFilter<"sitediaryrecords">
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }

  export type sitediaryrecordsOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    Date?: SortOrderInput | SortOrder
    Location?: SortOrderInput | SortOrder
    Works?: SortOrderInput | SortOrder
    Comments?: SortOrderInput | SortOrder
    Units?: SortOrderInput | SortOrder
    Amounts?: SortOrderInput | SortOrder
    WorkersInvolved?: SortOrderInput | SortOrder
    TimeInvolved?: SortOrderInput | SortOrder
    Photos?: SortOrder
    User?: UserOrderByWithRelationInput
    Site?: SiteOrderByWithRelationInput
  }

  export type sitediaryrecordsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: sitediaryrecordsWhereInput | sitediaryrecordsWhereInput[]
    OR?: sitediaryrecordsWhereInput[]
    NOT?: sitediaryrecordsWhereInput | sitediaryrecordsWhereInput[]
    userId?: StringNullableFilter<"sitediaryrecords"> | string | null
    siteId?: StringNullableFilter<"sitediaryrecords"> | string | null
    Date?: DateTimeNullableFilter<"sitediaryrecords"> | Date | string | null
    Location?: StringNullableFilter<"sitediaryrecords"> | string | null
    Works?: StringNullableFilter<"sitediaryrecords"> | string | null
    Comments?: StringNullableFilter<"sitediaryrecords"> | string | null
    Units?: StringNullableFilter<"sitediaryrecords"> | string | null
    Amounts?: FloatNullableFilter<"sitediaryrecords"> | number | null
    WorkersInvolved?: IntNullableFilter<"sitediaryrecords"> | number | null
    TimeInvolved?: FloatNullableFilter<"sitediaryrecords"> | number | null
    Photos?: StringNullableListFilter<"sitediaryrecords">
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }, "id">

  export type sitediaryrecordsOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    Date?: SortOrderInput | SortOrder
    Location?: SortOrderInput | SortOrder
    Works?: SortOrderInput | SortOrder
    Comments?: SortOrderInput | SortOrder
    Units?: SortOrderInput | SortOrder
    Amounts?: SortOrderInput | SortOrder
    WorkersInvolved?: SortOrderInput | SortOrder
    TimeInvolved?: SortOrderInput | SortOrder
    Photos?: SortOrder
    _count?: sitediaryrecordsCountOrderByAggregateInput
    _avg?: sitediaryrecordsAvgOrderByAggregateInput
    _max?: sitediaryrecordsMaxOrderByAggregateInput
    _min?: sitediaryrecordsMinOrderByAggregateInput
    _sum?: sitediaryrecordsSumOrderByAggregateInput
  }

  export type sitediaryrecordsScalarWhereWithAggregatesInput = {
    AND?: sitediaryrecordsScalarWhereWithAggregatesInput | sitediaryrecordsScalarWhereWithAggregatesInput[]
    OR?: sitediaryrecordsScalarWhereWithAggregatesInput[]
    NOT?: sitediaryrecordsScalarWhereWithAggregatesInput | sitediaryrecordsScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"sitediaryrecords"> | string
    userId?: StringNullableWithAggregatesFilter<"sitediaryrecords"> | string | null
    siteId?: StringNullableWithAggregatesFilter<"sitediaryrecords"> | string | null
    Date?: DateTimeNullableWithAggregatesFilter<"sitediaryrecords"> | Date | string | null
    Location?: StringNullableWithAggregatesFilter<"sitediaryrecords"> | string | null
    Works?: StringNullableWithAggregatesFilter<"sitediaryrecords"> | string | null
    Comments?: StringNullableWithAggregatesFilter<"sitediaryrecords"> | string | null
    Units?: StringNullableWithAggregatesFilter<"sitediaryrecords"> | string | null
    Amounts?: FloatNullableWithAggregatesFilter<"sitediaryrecords"> | number | null
    WorkersInvolved?: IntNullableWithAggregatesFilter<"sitediaryrecords"> | number | null
    TimeInvolved?: FloatNullableWithAggregatesFilter<"sitediaryrecords"> | number | null
    Photos?: StringNullableListFilter<"sitediaryrecords">
  }

  export type sitediarysettingsWhereInput = {
    AND?: sitediarysettingsWhereInput | sitediarysettingsWhereInput[]
    OR?: sitediarysettingsWhereInput[]
    NOT?: sitediarysettingsWhereInput | sitediarysettingsWhereInput[]
    id?: StringFilter<"sitediarysettings"> | string
    userId?: StringNullableFilter<"sitediarysettings"> | string | null
    fileUrl?: StringNullableFilter<"sitediarysettings"> | string | null
    siteId?: StringNullableFilter<"sitediarysettings"> | string | null
    schema?: StringNullableFilter<"sitediarysettings"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }

  export type sitediarysettingsOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    fileUrl?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    schema?: SortOrderInput | SortOrder
    User?: UserOrderByWithRelationInput
    Site?: SiteOrderByWithRelationInput
  }

  export type sitediarysettingsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    siteId?: string
    AND?: sitediarysettingsWhereInput | sitediarysettingsWhereInput[]
    OR?: sitediarysettingsWhereInput[]
    NOT?: sitediarysettingsWhereInput | sitediarysettingsWhereInput[]
    userId?: StringNullableFilter<"sitediarysettings"> | string | null
    fileUrl?: StringNullableFilter<"sitediarysettings"> | string | null
    schema?: StringNullableFilter<"sitediarysettings"> | string | null
    User?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    Site?: XOR<SiteNullableScalarRelationFilter, SiteWhereInput> | null
  }, "id" | "siteId">

  export type sitediarysettingsOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    fileUrl?: SortOrderInput | SortOrder
    siteId?: SortOrderInput | SortOrder
    schema?: SortOrderInput | SortOrder
    _count?: sitediarysettingsCountOrderByAggregateInput
    _max?: sitediarysettingsMaxOrderByAggregateInput
    _min?: sitediarysettingsMinOrderByAggregateInput
  }

  export type sitediarysettingsScalarWhereWithAggregatesInput = {
    AND?: sitediarysettingsScalarWhereWithAggregatesInput | sitediarysettingsScalarWhereWithAggregatesInput[]
    OR?: sitediarysettingsScalarWhereWithAggregatesInput[]
    NOT?: sitediarysettingsScalarWhereWithAggregatesInput | sitediarysettingsScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"sitediarysettings"> | string
    userId?: StringNullableWithAggregatesFilter<"sitediarysettings"> | string | null
    fileUrl?: StringNullableWithAggregatesFilter<"sitediarysettings"> | string | null
    siteId?: StringNullableWithAggregatesFilter<"sitediarysettings"> | string | null
    schema?: StringNullableWithAggregatesFilter<"sitediarysettings"> | string | null
  }

  export type UserCreateInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    posts?: PostCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    posts?: PostUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SiteCreateInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    posts?: PostCreateNestedManyWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    posts?: PostUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type SiteCreateManyInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
  }

  export type SiteUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SiteUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SubscriptionCreateInput = {
    stripeSubscriptionId: string
    interval: string
    status: string
    planId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    createdAt?: Date | string
    updatedAt?: Date | string
    User?: UserCreateNestedOneWithoutSubscriptionInput
  }

  export type SubscriptionUncheckedCreateInput = {
    stripeSubscriptionId: string
    interval: string
    status: string
    planId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    createdAt?: Date | string
    updatedAt?: Date | string
    userId?: string | null
  }

  export type SubscriptionUpdateInput = {
    stripeSubscriptionId?: StringFieldUpdateOperationsInput | string
    interval?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: IntFieldUpdateOperationsInput | number
    currentPeriodEnd?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    User?: UserUpdateOneWithoutSubscriptionNestedInput
  }

  export type SubscriptionUncheckedUpdateInput = {
    stripeSubscriptionId?: StringFieldUpdateOperationsInput | string
    interval?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: IntFieldUpdateOperationsInput | number
    currentPeriodEnd?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SubscriptionCreateManyInput = {
    stripeSubscriptionId: string
    interval: string
    status: string
    planId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    createdAt?: Date | string
    updatedAt?: Date | string
    userId?: string | null
  }

  export type SubscriptionUpdateManyMutationInput = {
    stripeSubscriptionId?: StringFieldUpdateOperationsInput | string
    interval?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: IntFieldUpdateOperationsInput | number
    currentPeriodEnd?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateManyInput = {
    stripeSubscriptionId?: StringFieldUpdateOperationsInput | string
    interval?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: IntFieldUpdateOperationsInput | number
    currentPeriodEnd?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoicesCreateInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    User?: UserCreateNestedOneWithoutInvoicesInput
    Site?: SiteCreateNestedOneWithoutInvoicesInput
    items?: InvoiceItemsCreateNestedManyWithoutInvoiceInput
  }

  export type InvoicesUncheckedCreateInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    userId?: string | null
    SiteId?: string | null
    items?: InvoiceItemsUncheckedCreateNestedManyWithoutInvoiceInput
  }

  export type InvoicesUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    User?: UserUpdateOneWithoutInvoicesNestedInput
    Site?: SiteUpdateOneWithoutInvoicesNestedInput
    items?: InvoiceItemsUpdateManyWithoutInvoiceNestedInput
  }

  export type InvoicesUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    SiteId?: NullableStringFieldUpdateOperationsInput | string | null
    items?: InvoiceItemsUncheckedUpdateManyWithoutInvoiceNestedInput
  }

  export type InvoicesCreateManyInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    userId?: string | null
    SiteId?: string | null
  }

  export type InvoicesUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type InvoicesUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    SiteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PostCreateInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    User?: UserCreateNestedOneWithoutPostsInput
    Site?: SiteCreateNestedOneWithoutPostsInput
  }

  export type PostUncheckedCreateInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    userId?: string | null
    siteId?: string | null
  }

  export type PostUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    User?: UserUpdateOneWithoutPostsNestedInput
    Site?: SiteUpdateOneWithoutPostsNestedInput
  }

  export type PostUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PostCreateManyInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    userId?: string | null
    siteId?: string | null
  }

  export type PostUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PostUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoiceItemsCreateInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    invoice: InvoicesCreateNestedOneWithoutItemsInput
    Site?: SiteCreateNestedOneWithoutInvoiceItemsInput
  }

  export type InvoiceItemsUncheckedCreateInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    invoiceId: string
    siteId?: string | null
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
  }

  export type InvoiceItemsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    invoice?: InvoicesUpdateOneRequiredWithoutItemsNestedInput
    Site?: SiteUpdateOneWithoutInvoiceItemsNestedInput
  }

  export type InvoiceItemsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceId?: StringFieldUpdateOperationsInput | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoiceItemsCreateManyInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    invoiceId: string
    siteId?: string | null
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
  }

  export type InvoiceItemsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoiceItemsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceId?: StringFieldUpdateOperationsInput | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AIconversationCreateInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    User?: UserCreateNestedOneWithoutAIconversationInput
    site?: SiteCreateNestedOneWithoutAIconversationInput
  }

  export type AIconversationUncheckedCreateInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    userId: string
    siteId: string
  }

  export type AIconversationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    User?: UserUpdateOneWithoutAIconversationNestedInput
    site?: SiteUpdateOneWithoutAIconversationNestedInput
  }

  export type AIconversationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    userId?: StringFieldUpdateOperationsInput | string
    siteId?: StringFieldUpdateOperationsInput | string
  }

  export type AIconversationCreateManyInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    userId: string
    siteId: string
  }

  export type AIconversationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
  }

  export type AIconversationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    userId?: StringFieldUpdateOperationsInput | string
    siteId?: StringFieldUpdateOperationsInput | string
  }

  export type DocumentsCreateInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    User?: UserCreateNestedOneWithoutDocumentsInput
    Site?: SiteCreateNestedOneWithoutDocumentsInput
  }

  export type DocumentsUncheckedCreateInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    userId?: string | null
    siteId?: string | null
  }

  export type DocumentsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    User?: UserUpdateOneWithoutDocumentsNestedInput
    Site?: SiteUpdateOneWithoutDocumentsNestedInput
  }

  export type DocumentsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DocumentsCreateManyInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    userId?: string | null
    siteId?: string | null
  }

  export type DocumentsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
  }

  export type DocumentsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type sitediaryrecordsCreateInput = {
    id?: string
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
    User?: UserCreateNestedOneWithoutSitediaryrecordsInput
    Site?: SiteCreateNestedOneWithoutSitediaryrecordsInput
  }

  export type sitediaryrecordsUncheckedCreateInput = {
    id?: string
    userId?: string | null
    siteId?: string | null
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
  }

  export type sitediaryrecordsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
    User?: UserUpdateOneWithoutSitediaryrecordsNestedInput
    Site?: SiteUpdateOneWithoutSitediaryrecordsNestedInput
  }

  export type sitediaryrecordsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
  }

  export type sitediaryrecordsCreateManyInput = {
    id?: string
    userId?: string | null
    siteId?: string | null
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
  }

  export type sitediaryrecordsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
  }

  export type sitediaryrecordsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
  }

  export type sitediarysettingsCreateInput = {
    id?: string
    fileUrl?: string | null
    schema?: string | null
    User?: UserCreateNestedOneWithoutSitediarysettingsInput
    Site?: SiteCreateNestedOneWithoutSitediarysettingsInput
  }

  export type sitediarysettingsUncheckedCreateInput = {
    id?: string
    userId?: string | null
    fileUrl?: string | null
    siteId?: string | null
    schema?: string | null
  }

  export type sitediarysettingsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSitediarysettingsNestedInput
    Site?: SiteUpdateOneWithoutSitediarysettingsNestedInput
  }

  export type sitediarysettingsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type sitediarysettingsCreateManyInput = {
    id?: string
    userId?: string | null
    fileUrl?: string | null
    siteId?: string | null
    schema?: string | null
  }

  export type sitediarysettingsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type sitediarysettingsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SiteListRelationFilter = {
    every?: SiteWhereInput
    some?: SiteWhereInput
    none?: SiteWhereInput
  }

  export type PostListRelationFilter = {
    every?: PostWhereInput
    some?: PostWhereInput
    none?: PostWhereInput
  }

  export type InvoicesListRelationFilter = {
    every?: InvoicesWhereInput
    some?: InvoicesWhereInput
    none?: InvoicesWhereInput
  }

  export type DocumentsListRelationFilter = {
    every?: DocumentsWhereInput
    some?: DocumentsWhereInput
    none?: DocumentsWhereInput
  }

  export type SitediaryrecordsListRelationFilter = {
    every?: sitediaryrecordsWhereInput
    some?: sitediaryrecordsWhereInput
    none?: sitediaryrecordsWhereInput
  }

  export type SubscriptionNullableScalarRelationFilter = {
    is?: SubscriptionWhereInput | null
    isNot?: SubscriptionWhereInput | null
  }

  export type AIconversationListRelationFilter = {
    every?: AIconversationWhereInput
    some?: AIconversationWhereInput
    none?: AIconversationWhereInput
  }

  export type SitediarysettingsListRelationFilter = {
    every?: sitediarysettingsWhereInput
    some?: sitediarysettingsWhereInput
    none?: sitediarysettingsWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type SiteOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PostOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type InvoicesOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type DocumentsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type sitediaryrecordsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AIconversationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type sitediarysettingsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    profileImage?: SortOrder
    customerId?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    profileImage?: SortOrder
    customerId?: SortOrder
    createdAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    profileImage?: SortOrder
    customerId?: SortOrder
    createdAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type InvoiceItemsListRelationFilter = {
    every?: InvoiceItemsWhereInput
    some?: InvoiceItemsWhereInput
    none?: InvoiceItemsWhereInput
  }

  export type AIconversationNullableScalarRelationFilter = {
    is?: AIconversationWhereInput | null
    isNot?: AIconversationWhereInput | null
  }

  export type SitediarysettingsNullableScalarRelationFilter = {
    is?: sitediarysettingsWhereInput | null
    isNot?: sitediarysettingsWhereInput | null
  }

  export type InvoiceItemsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SiteCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    subdirectory?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    imageUrl?: SortOrder
    userId?: SortOrder
  }

  export type SiteMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    subdirectory?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    imageUrl?: SortOrder
    userId?: SortOrder
  }

  export type SiteMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    subdirectory?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    imageUrl?: SortOrder
    userId?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type SubscriptionCountOrderByAggregateInput = {
    stripeSubscriptionId?: SortOrder
    interval?: SortOrder
    status?: SortOrder
    planId?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrder
  }

  export type SubscriptionAvgOrderByAggregateInput = {
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
  }

  export type SubscriptionMaxOrderByAggregateInput = {
    stripeSubscriptionId?: SortOrder
    interval?: SortOrder
    status?: SortOrder
    planId?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrder
  }

  export type SubscriptionMinOrderByAggregateInput = {
    stripeSubscriptionId?: SortOrder
    interval?: SortOrder
    status?: SortOrder
    planId?: SortOrder
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrder
  }

  export type SubscriptionSumOrderByAggregateInput = {
    currentPeriodStart?: SortOrder
    currentPeriodEnd?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type SiteNullableScalarRelationFilter = {
    is?: SiteWhereInput | null
    isNot?: SiteWhereInput | null
  }

  export type InvoicesCountOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    invoiceNumber?: SortOrder
    sellerName?: SortOrder
    invoiceTotalSumNoVat?: SortOrder
    invoiceTotalSumWithVat?: SortOrder
    buyerName?: SortOrder
    invoiceDate?: SortOrder
    paymentDate?: SortOrder
    isInvoice?: SortOrder
    isCreditDebitProformaOrAdvanced?: SortOrder
    uploadedAt?: SortOrder
    userId?: SortOrder
    SiteId?: SortOrder
  }

  export type InvoicesAvgOrderByAggregateInput = {
    invoiceTotalSumNoVat?: SortOrder
    invoiceTotalSumWithVat?: SortOrder
  }

  export type InvoicesMaxOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    invoiceNumber?: SortOrder
    sellerName?: SortOrder
    invoiceTotalSumNoVat?: SortOrder
    invoiceTotalSumWithVat?: SortOrder
    buyerName?: SortOrder
    invoiceDate?: SortOrder
    paymentDate?: SortOrder
    isInvoice?: SortOrder
    isCreditDebitProformaOrAdvanced?: SortOrder
    uploadedAt?: SortOrder
    userId?: SortOrder
    SiteId?: SortOrder
  }

  export type InvoicesMinOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    invoiceNumber?: SortOrder
    sellerName?: SortOrder
    invoiceTotalSumNoVat?: SortOrder
    invoiceTotalSumWithVat?: SortOrder
    buyerName?: SortOrder
    invoiceDate?: SortOrder
    paymentDate?: SortOrder
    isInvoice?: SortOrder
    isCreditDebitProformaOrAdvanced?: SortOrder
    uploadedAt?: SortOrder
    userId?: SortOrder
    SiteId?: SortOrder
  }

  export type InvoicesSumOrderByAggregateInput = {
    invoiceTotalSumNoVat?: SortOrder
    invoiceTotalSumWithVat?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type PostCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    articleContent?: SortOrder
    smallDescription?: SortOrder
    image?: SortOrder
    slug?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }

  export type PostMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    smallDescription?: SortOrder
    image?: SortOrder
    slug?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }

  export type PostMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    smallDescription?: SortOrder
    image?: SortOrder
    slug?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type InvoicesScalarRelationFilter = {
    is?: InvoicesWhereInput
    isNot?: InvoicesWhereInput
  }

  export type InvoiceItemsCountOrderByAggregateInput = {
    id?: SortOrder
    item?: SortOrder
    quantity?: SortOrder
    unitOfMeasure?: SortOrder
    pricePerUnitOfMeasure?: SortOrder
    sum?: SortOrder
    currency?: SortOrder
    category?: SortOrder
    itemDescription?: SortOrder
    commentsForUser?: SortOrder
    isInvoice?: SortOrder
    invoiceId?: SortOrder
    siteId?: SortOrder
    invoiceNumber?: SortOrder
    sellerName?: SortOrder
    invoiceDate?: SortOrder
    paymentDate?: SortOrder
  }

  export type InvoiceItemsAvgOrderByAggregateInput = {
    quantity?: SortOrder
    pricePerUnitOfMeasure?: SortOrder
    sum?: SortOrder
  }

  export type InvoiceItemsMaxOrderByAggregateInput = {
    id?: SortOrder
    item?: SortOrder
    quantity?: SortOrder
    unitOfMeasure?: SortOrder
    pricePerUnitOfMeasure?: SortOrder
    sum?: SortOrder
    currency?: SortOrder
    category?: SortOrder
    itemDescription?: SortOrder
    commentsForUser?: SortOrder
    isInvoice?: SortOrder
    invoiceId?: SortOrder
    siteId?: SortOrder
    invoiceNumber?: SortOrder
    sellerName?: SortOrder
    invoiceDate?: SortOrder
    paymentDate?: SortOrder
  }

  export type InvoiceItemsMinOrderByAggregateInput = {
    id?: SortOrder
    item?: SortOrder
    quantity?: SortOrder
    unitOfMeasure?: SortOrder
    pricePerUnitOfMeasure?: SortOrder
    sum?: SortOrder
    currency?: SortOrder
    category?: SortOrder
    itemDescription?: SortOrder
    commentsForUser?: SortOrder
    isInvoice?: SortOrder
    invoiceId?: SortOrder
    siteId?: SortOrder
    invoiceNumber?: SortOrder
    sellerName?: SortOrder
    invoiceDate?: SortOrder
    paymentDate?: SortOrder
  }

  export type InvoiceItemsSumOrderByAggregateInput = {
    quantity?: SortOrder
    pricePerUnitOfMeasure?: SortOrder
    sum?: SortOrder
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type AIconversationUserIdSiteIdCompoundUniqueInput = {
    userId: string
    siteId: string
  }

  export type AIconversationCountOrderByAggregateInput = {
    id?: SortOrder
    thread?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }

  export type AIconversationMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }

  export type AIconversationMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type DocumentsCountOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    documentType?: SortOrder
    documentName?: SortOrder
    description?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }

  export type DocumentsMaxOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    documentType?: SortOrder
    documentName?: SortOrder
    description?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }

  export type DocumentsMinOrderByAggregateInput = {
    id?: SortOrder
    url?: SortOrder
    documentType?: SortOrder
    documentName?: SortOrder
    description?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type sitediaryrecordsCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
    Date?: SortOrder
    Location?: SortOrder
    Works?: SortOrder
    Comments?: SortOrder
    Units?: SortOrder
    Amounts?: SortOrder
    WorkersInvolved?: SortOrder
    TimeInvolved?: SortOrder
    Photos?: SortOrder
  }

  export type sitediaryrecordsAvgOrderByAggregateInput = {
    Amounts?: SortOrder
    WorkersInvolved?: SortOrder
    TimeInvolved?: SortOrder
  }

  export type sitediaryrecordsMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
    Date?: SortOrder
    Location?: SortOrder
    Works?: SortOrder
    Comments?: SortOrder
    Units?: SortOrder
    Amounts?: SortOrder
    WorkersInvolved?: SortOrder
    TimeInvolved?: SortOrder
  }

  export type sitediaryrecordsMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    siteId?: SortOrder
    Date?: SortOrder
    Location?: SortOrder
    Works?: SortOrder
    Comments?: SortOrder
    Units?: SortOrder
    Amounts?: SortOrder
    WorkersInvolved?: SortOrder
    TimeInvolved?: SortOrder
  }

  export type sitediaryrecordsSumOrderByAggregateInput = {
    Amounts?: SortOrder
    WorkersInvolved?: SortOrder
    TimeInvolved?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type sitediarysettingsCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fileUrl?: SortOrder
    siteId?: SortOrder
    schema?: SortOrder
  }

  export type sitediarysettingsMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fileUrl?: SortOrder
    siteId?: SortOrder
    schema?: SortOrder
  }

  export type sitediarysettingsMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    fileUrl?: SortOrder
    siteId?: SortOrder
    schema?: SortOrder
  }

  export type SiteCreateNestedManyWithoutUserInput = {
    create?: XOR<SiteCreateWithoutUserInput, SiteUncheckedCreateWithoutUserInput> | SiteCreateWithoutUserInput[] | SiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SiteCreateOrConnectWithoutUserInput | SiteCreateOrConnectWithoutUserInput[]
    createMany?: SiteCreateManyUserInputEnvelope
    connect?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
  }

  export type PostCreateNestedManyWithoutUserInput = {
    create?: XOR<PostCreateWithoutUserInput, PostUncheckedCreateWithoutUserInput> | PostCreateWithoutUserInput[] | PostUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PostCreateOrConnectWithoutUserInput | PostCreateOrConnectWithoutUserInput[]
    createMany?: PostCreateManyUserInputEnvelope
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
  }

  export type InvoicesCreateNestedManyWithoutUserInput = {
    create?: XOR<InvoicesCreateWithoutUserInput, InvoicesUncheckedCreateWithoutUserInput> | InvoicesCreateWithoutUserInput[] | InvoicesUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutUserInput | InvoicesCreateOrConnectWithoutUserInput[]
    createMany?: InvoicesCreateManyUserInputEnvelope
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
  }

  export type DocumentsCreateNestedManyWithoutUserInput = {
    create?: XOR<DocumentsCreateWithoutUserInput, DocumentsUncheckedCreateWithoutUserInput> | DocumentsCreateWithoutUserInput[] | DocumentsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutUserInput | DocumentsCreateOrConnectWithoutUserInput[]
    createMany?: DocumentsCreateManyUserInputEnvelope
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
  }

  export type sitediaryrecordsCreateNestedManyWithoutUserInput = {
    create?: XOR<sitediaryrecordsCreateWithoutUserInput, sitediaryrecordsUncheckedCreateWithoutUserInput> | sitediaryrecordsCreateWithoutUserInput[] | sitediaryrecordsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutUserInput | sitediaryrecordsCreateOrConnectWithoutUserInput[]
    createMany?: sitediaryrecordsCreateManyUserInputEnvelope
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
  }

  export type SubscriptionCreateNestedOneWithoutUserInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    connect?: SubscriptionWhereUniqueInput
  }

  export type AIconversationCreateNestedManyWithoutUserInput = {
    create?: XOR<AIconversationCreateWithoutUserInput, AIconversationUncheckedCreateWithoutUserInput> | AIconversationCreateWithoutUserInput[] | AIconversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIconversationCreateOrConnectWithoutUserInput | AIconversationCreateOrConnectWithoutUserInput[]
    createMany?: AIconversationCreateManyUserInputEnvelope
    connect?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
  }

  export type sitediarysettingsCreateNestedManyWithoutUserInput = {
    create?: XOR<sitediarysettingsCreateWithoutUserInput, sitediarysettingsUncheckedCreateWithoutUserInput> | sitediarysettingsCreateWithoutUserInput[] | sitediarysettingsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutUserInput | sitediarysettingsCreateOrConnectWithoutUserInput[]
    createMany?: sitediarysettingsCreateManyUserInputEnvelope
    connect?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
  }

  export type SiteUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SiteCreateWithoutUserInput, SiteUncheckedCreateWithoutUserInput> | SiteCreateWithoutUserInput[] | SiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SiteCreateOrConnectWithoutUserInput | SiteCreateOrConnectWithoutUserInput[]
    createMany?: SiteCreateManyUserInputEnvelope
    connect?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
  }

  export type PostUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<PostCreateWithoutUserInput, PostUncheckedCreateWithoutUserInput> | PostCreateWithoutUserInput[] | PostUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PostCreateOrConnectWithoutUserInput | PostCreateOrConnectWithoutUserInput[]
    createMany?: PostCreateManyUserInputEnvelope
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
  }

  export type InvoicesUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<InvoicesCreateWithoutUserInput, InvoicesUncheckedCreateWithoutUserInput> | InvoicesCreateWithoutUserInput[] | InvoicesUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutUserInput | InvoicesCreateOrConnectWithoutUserInput[]
    createMany?: InvoicesCreateManyUserInputEnvelope
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
  }

  export type DocumentsUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<DocumentsCreateWithoutUserInput, DocumentsUncheckedCreateWithoutUserInput> | DocumentsCreateWithoutUserInput[] | DocumentsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutUserInput | DocumentsCreateOrConnectWithoutUserInput[]
    createMany?: DocumentsCreateManyUserInputEnvelope
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
  }

  export type sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<sitediaryrecordsCreateWithoutUserInput, sitediaryrecordsUncheckedCreateWithoutUserInput> | sitediaryrecordsCreateWithoutUserInput[] | sitediaryrecordsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutUserInput | sitediaryrecordsCreateOrConnectWithoutUserInput[]
    createMany?: sitediaryrecordsCreateManyUserInputEnvelope
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
  }

  export type SubscriptionUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    connect?: SubscriptionWhereUniqueInput
  }

  export type AIconversationUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AIconversationCreateWithoutUserInput, AIconversationUncheckedCreateWithoutUserInput> | AIconversationCreateWithoutUserInput[] | AIconversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIconversationCreateOrConnectWithoutUserInput | AIconversationCreateOrConnectWithoutUserInput[]
    createMany?: AIconversationCreateManyUserInputEnvelope
    connect?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
  }

  export type sitediarysettingsUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<sitediarysettingsCreateWithoutUserInput, sitediarysettingsUncheckedCreateWithoutUserInput> | sitediarysettingsCreateWithoutUserInput[] | sitediarysettingsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutUserInput | sitediarysettingsCreateOrConnectWithoutUserInput[]
    createMany?: sitediarysettingsCreateManyUserInputEnvelope
    connect?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type SiteUpdateManyWithoutUserNestedInput = {
    create?: XOR<SiteCreateWithoutUserInput, SiteUncheckedCreateWithoutUserInput> | SiteCreateWithoutUserInput[] | SiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SiteCreateOrConnectWithoutUserInput | SiteCreateOrConnectWithoutUserInput[]
    upsert?: SiteUpsertWithWhereUniqueWithoutUserInput | SiteUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SiteCreateManyUserInputEnvelope
    set?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    disconnect?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    delete?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    connect?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    update?: SiteUpdateWithWhereUniqueWithoutUserInput | SiteUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SiteUpdateManyWithWhereWithoutUserInput | SiteUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SiteScalarWhereInput | SiteScalarWhereInput[]
  }

  export type PostUpdateManyWithoutUserNestedInput = {
    create?: XOR<PostCreateWithoutUserInput, PostUncheckedCreateWithoutUserInput> | PostCreateWithoutUserInput[] | PostUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PostCreateOrConnectWithoutUserInput | PostCreateOrConnectWithoutUserInput[]
    upsert?: PostUpsertWithWhereUniqueWithoutUserInput | PostUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PostCreateManyUserInputEnvelope
    set?: PostWhereUniqueInput | PostWhereUniqueInput[]
    disconnect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    delete?: PostWhereUniqueInput | PostWhereUniqueInput[]
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    update?: PostUpdateWithWhereUniqueWithoutUserInput | PostUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PostUpdateManyWithWhereWithoutUserInput | PostUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PostScalarWhereInput | PostScalarWhereInput[]
  }

  export type InvoicesUpdateManyWithoutUserNestedInput = {
    create?: XOR<InvoicesCreateWithoutUserInput, InvoicesUncheckedCreateWithoutUserInput> | InvoicesCreateWithoutUserInput[] | InvoicesUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutUserInput | InvoicesCreateOrConnectWithoutUserInput[]
    upsert?: InvoicesUpsertWithWhereUniqueWithoutUserInput | InvoicesUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: InvoicesCreateManyUserInputEnvelope
    set?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    disconnect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    delete?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    update?: InvoicesUpdateWithWhereUniqueWithoutUserInput | InvoicesUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: InvoicesUpdateManyWithWhereWithoutUserInput | InvoicesUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: InvoicesScalarWhereInput | InvoicesScalarWhereInput[]
  }

  export type DocumentsUpdateManyWithoutUserNestedInput = {
    create?: XOR<DocumentsCreateWithoutUserInput, DocumentsUncheckedCreateWithoutUserInput> | DocumentsCreateWithoutUserInput[] | DocumentsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutUserInput | DocumentsCreateOrConnectWithoutUserInput[]
    upsert?: DocumentsUpsertWithWhereUniqueWithoutUserInput | DocumentsUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: DocumentsCreateManyUserInputEnvelope
    set?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    disconnect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    delete?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    update?: DocumentsUpdateWithWhereUniqueWithoutUserInput | DocumentsUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: DocumentsUpdateManyWithWhereWithoutUserInput | DocumentsUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: DocumentsScalarWhereInput | DocumentsScalarWhereInput[]
  }

  export type sitediaryrecordsUpdateManyWithoutUserNestedInput = {
    create?: XOR<sitediaryrecordsCreateWithoutUserInput, sitediaryrecordsUncheckedCreateWithoutUserInput> | sitediaryrecordsCreateWithoutUserInput[] | sitediaryrecordsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutUserInput | sitediaryrecordsCreateOrConnectWithoutUserInput[]
    upsert?: sitediaryrecordsUpsertWithWhereUniqueWithoutUserInput | sitediaryrecordsUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: sitediaryrecordsCreateManyUserInputEnvelope
    set?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    disconnect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    delete?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    update?: sitediaryrecordsUpdateWithWhereUniqueWithoutUserInput | sitediaryrecordsUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: sitediaryrecordsUpdateManyWithWhereWithoutUserInput | sitediaryrecordsUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: sitediaryrecordsScalarWhereInput | sitediaryrecordsScalarWhereInput[]
  }

  export type SubscriptionUpdateOneWithoutUserNestedInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    upsert?: SubscriptionUpsertWithoutUserInput
    disconnect?: SubscriptionWhereInput | boolean
    delete?: SubscriptionWhereInput | boolean
    connect?: SubscriptionWhereUniqueInput
    update?: XOR<XOR<SubscriptionUpdateToOneWithWhereWithoutUserInput, SubscriptionUpdateWithoutUserInput>, SubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type AIconversationUpdateManyWithoutUserNestedInput = {
    create?: XOR<AIconversationCreateWithoutUserInput, AIconversationUncheckedCreateWithoutUserInput> | AIconversationCreateWithoutUserInput[] | AIconversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIconversationCreateOrConnectWithoutUserInput | AIconversationCreateOrConnectWithoutUserInput[]
    upsert?: AIconversationUpsertWithWhereUniqueWithoutUserInput | AIconversationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AIconversationCreateManyUserInputEnvelope
    set?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    disconnect?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    delete?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    connect?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    update?: AIconversationUpdateWithWhereUniqueWithoutUserInput | AIconversationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AIconversationUpdateManyWithWhereWithoutUserInput | AIconversationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AIconversationScalarWhereInput | AIconversationScalarWhereInput[]
  }

  export type sitediarysettingsUpdateManyWithoutUserNestedInput = {
    create?: XOR<sitediarysettingsCreateWithoutUserInput, sitediarysettingsUncheckedCreateWithoutUserInput> | sitediarysettingsCreateWithoutUserInput[] | sitediarysettingsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutUserInput | sitediarysettingsCreateOrConnectWithoutUserInput[]
    upsert?: sitediarysettingsUpsertWithWhereUniqueWithoutUserInput | sitediarysettingsUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: sitediarysettingsCreateManyUserInputEnvelope
    set?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    disconnect?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    delete?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    connect?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    update?: sitediarysettingsUpdateWithWhereUniqueWithoutUserInput | sitediarysettingsUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: sitediarysettingsUpdateManyWithWhereWithoutUserInput | sitediarysettingsUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: sitediarysettingsScalarWhereInput | sitediarysettingsScalarWhereInput[]
  }

  export type SiteUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SiteCreateWithoutUserInput, SiteUncheckedCreateWithoutUserInput> | SiteCreateWithoutUserInput[] | SiteUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SiteCreateOrConnectWithoutUserInput | SiteCreateOrConnectWithoutUserInput[]
    upsert?: SiteUpsertWithWhereUniqueWithoutUserInput | SiteUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SiteCreateManyUserInputEnvelope
    set?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    disconnect?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    delete?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    connect?: SiteWhereUniqueInput | SiteWhereUniqueInput[]
    update?: SiteUpdateWithWhereUniqueWithoutUserInput | SiteUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SiteUpdateManyWithWhereWithoutUserInput | SiteUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SiteScalarWhereInput | SiteScalarWhereInput[]
  }

  export type PostUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<PostCreateWithoutUserInput, PostUncheckedCreateWithoutUserInput> | PostCreateWithoutUserInput[] | PostUncheckedCreateWithoutUserInput[]
    connectOrCreate?: PostCreateOrConnectWithoutUserInput | PostCreateOrConnectWithoutUserInput[]
    upsert?: PostUpsertWithWhereUniqueWithoutUserInput | PostUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: PostCreateManyUserInputEnvelope
    set?: PostWhereUniqueInput | PostWhereUniqueInput[]
    disconnect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    delete?: PostWhereUniqueInput | PostWhereUniqueInput[]
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    update?: PostUpdateWithWhereUniqueWithoutUserInput | PostUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: PostUpdateManyWithWhereWithoutUserInput | PostUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: PostScalarWhereInput | PostScalarWhereInput[]
  }

  export type InvoicesUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<InvoicesCreateWithoutUserInput, InvoicesUncheckedCreateWithoutUserInput> | InvoicesCreateWithoutUserInput[] | InvoicesUncheckedCreateWithoutUserInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutUserInput | InvoicesCreateOrConnectWithoutUserInput[]
    upsert?: InvoicesUpsertWithWhereUniqueWithoutUserInput | InvoicesUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: InvoicesCreateManyUserInputEnvelope
    set?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    disconnect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    delete?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    update?: InvoicesUpdateWithWhereUniqueWithoutUserInput | InvoicesUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: InvoicesUpdateManyWithWhereWithoutUserInput | InvoicesUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: InvoicesScalarWhereInput | InvoicesScalarWhereInput[]
  }

  export type DocumentsUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<DocumentsCreateWithoutUserInput, DocumentsUncheckedCreateWithoutUserInput> | DocumentsCreateWithoutUserInput[] | DocumentsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutUserInput | DocumentsCreateOrConnectWithoutUserInput[]
    upsert?: DocumentsUpsertWithWhereUniqueWithoutUserInput | DocumentsUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: DocumentsCreateManyUserInputEnvelope
    set?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    disconnect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    delete?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    update?: DocumentsUpdateWithWhereUniqueWithoutUserInput | DocumentsUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: DocumentsUpdateManyWithWhereWithoutUserInput | DocumentsUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: DocumentsScalarWhereInput | DocumentsScalarWhereInput[]
  }

  export type sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<sitediaryrecordsCreateWithoutUserInput, sitediaryrecordsUncheckedCreateWithoutUserInput> | sitediaryrecordsCreateWithoutUserInput[] | sitediaryrecordsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutUserInput | sitediaryrecordsCreateOrConnectWithoutUserInput[]
    upsert?: sitediaryrecordsUpsertWithWhereUniqueWithoutUserInput | sitediaryrecordsUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: sitediaryrecordsCreateManyUserInputEnvelope
    set?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    disconnect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    delete?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    update?: sitediaryrecordsUpdateWithWhereUniqueWithoutUserInput | sitediaryrecordsUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: sitediaryrecordsUpdateManyWithWhereWithoutUserInput | sitediaryrecordsUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: sitediaryrecordsScalarWhereInput | sitediaryrecordsScalarWhereInput[]
  }

  export type SubscriptionUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    connectOrCreate?: SubscriptionCreateOrConnectWithoutUserInput
    upsert?: SubscriptionUpsertWithoutUserInput
    disconnect?: SubscriptionWhereInput | boolean
    delete?: SubscriptionWhereInput | boolean
    connect?: SubscriptionWhereUniqueInput
    update?: XOR<XOR<SubscriptionUpdateToOneWithWhereWithoutUserInput, SubscriptionUpdateWithoutUserInput>, SubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type AIconversationUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AIconversationCreateWithoutUserInput, AIconversationUncheckedCreateWithoutUserInput> | AIconversationCreateWithoutUserInput[] | AIconversationUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AIconversationCreateOrConnectWithoutUserInput | AIconversationCreateOrConnectWithoutUserInput[]
    upsert?: AIconversationUpsertWithWhereUniqueWithoutUserInput | AIconversationUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AIconversationCreateManyUserInputEnvelope
    set?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    disconnect?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    delete?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    connect?: AIconversationWhereUniqueInput | AIconversationWhereUniqueInput[]
    update?: AIconversationUpdateWithWhereUniqueWithoutUserInput | AIconversationUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AIconversationUpdateManyWithWhereWithoutUserInput | AIconversationUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AIconversationScalarWhereInput | AIconversationScalarWhereInput[]
  }

  export type sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<sitediarysettingsCreateWithoutUserInput, sitediarysettingsUncheckedCreateWithoutUserInput> | sitediarysettingsCreateWithoutUserInput[] | sitediarysettingsUncheckedCreateWithoutUserInput[]
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutUserInput | sitediarysettingsCreateOrConnectWithoutUserInput[]
    upsert?: sitediarysettingsUpsertWithWhereUniqueWithoutUserInput | sitediarysettingsUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: sitediarysettingsCreateManyUserInputEnvelope
    set?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    disconnect?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    delete?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    connect?: sitediarysettingsWhereUniqueInput | sitediarysettingsWhereUniqueInput[]
    update?: sitediarysettingsUpdateWithWhereUniqueWithoutUserInput | sitediarysettingsUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: sitediarysettingsUpdateManyWithWhereWithoutUserInput | sitediarysettingsUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: sitediarysettingsScalarWhereInput | sitediarysettingsScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutSiteInput = {
    create?: XOR<UserCreateWithoutSiteInput, UserUncheckedCreateWithoutSiteInput>
    connectOrCreate?: UserCreateOrConnectWithoutSiteInput
    connect?: UserWhereUniqueInput
  }

  export type PostCreateNestedManyWithoutSiteInput = {
    create?: XOR<PostCreateWithoutSiteInput, PostUncheckedCreateWithoutSiteInput> | PostCreateWithoutSiteInput[] | PostUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: PostCreateOrConnectWithoutSiteInput | PostCreateOrConnectWithoutSiteInput[]
    createMany?: PostCreateManySiteInputEnvelope
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
  }

  export type InvoicesCreateNestedManyWithoutSiteInput = {
    create?: XOR<InvoicesCreateWithoutSiteInput, InvoicesUncheckedCreateWithoutSiteInput> | InvoicesCreateWithoutSiteInput[] | InvoicesUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutSiteInput | InvoicesCreateOrConnectWithoutSiteInput[]
    createMany?: InvoicesCreateManySiteInputEnvelope
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
  }

  export type InvoiceItemsCreateNestedManyWithoutSiteInput = {
    create?: XOR<InvoiceItemsCreateWithoutSiteInput, InvoiceItemsUncheckedCreateWithoutSiteInput> | InvoiceItemsCreateWithoutSiteInput[] | InvoiceItemsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutSiteInput | InvoiceItemsCreateOrConnectWithoutSiteInput[]
    createMany?: InvoiceItemsCreateManySiteInputEnvelope
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
  }

  export type DocumentsCreateNestedManyWithoutSiteInput = {
    create?: XOR<DocumentsCreateWithoutSiteInput, DocumentsUncheckedCreateWithoutSiteInput> | DocumentsCreateWithoutSiteInput[] | DocumentsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutSiteInput | DocumentsCreateOrConnectWithoutSiteInput[]
    createMany?: DocumentsCreateManySiteInputEnvelope
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
  }

  export type sitediaryrecordsCreateNestedManyWithoutSiteInput = {
    create?: XOR<sitediaryrecordsCreateWithoutSiteInput, sitediaryrecordsUncheckedCreateWithoutSiteInput> | sitediaryrecordsCreateWithoutSiteInput[] | sitediaryrecordsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutSiteInput | sitediaryrecordsCreateOrConnectWithoutSiteInput[]
    createMany?: sitediaryrecordsCreateManySiteInputEnvelope
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
  }

  export type AIconversationCreateNestedOneWithoutSiteInput = {
    create?: XOR<AIconversationCreateWithoutSiteInput, AIconversationUncheckedCreateWithoutSiteInput>
    connectOrCreate?: AIconversationCreateOrConnectWithoutSiteInput
    connect?: AIconversationWhereUniqueInput
  }

  export type sitediarysettingsCreateNestedOneWithoutSiteInput = {
    create?: XOR<sitediarysettingsCreateWithoutSiteInput, sitediarysettingsUncheckedCreateWithoutSiteInput>
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutSiteInput
    connect?: sitediarysettingsWhereUniqueInput
  }

  export type PostUncheckedCreateNestedManyWithoutSiteInput = {
    create?: XOR<PostCreateWithoutSiteInput, PostUncheckedCreateWithoutSiteInput> | PostCreateWithoutSiteInput[] | PostUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: PostCreateOrConnectWithoutSiteInput | PostCreateOrConnectWithoutSiteInput[]
    createMany?: PostCreateManySiteInputEnvelope
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
  }

  export type InvoicesUncheckedCreateNestedManyWithoutSiteInput = {
    create?: XOR<InvoicesCreateWithoutSiteInput, InvoicesUncheckedCreateWithoutSiteInput> | InvoicesCreateWithoutSiteInput[] | InvoicesUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutSiteInput | InvoicesCreateOrConnectWithoutSiteInput[]
    createMany?: InvoicesCreateManySiteInputEnvelope
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
  }

  export type InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput = {
    create?: XOR<InvoiceItemsCreateWithoutSiteInput, InvoiceItemsUncheckedCreateWithoutSiteInput> | InvoiceItemsCreateWithoutSiteInput[] | InvoiceItemsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutSiteInput | InvoiceItemsCreateOrConnectWithoutSiteInput[]
    createMany?: InvoiceItemsCreateManySiteInputEnvelope
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
  }

  export type DocumentsUncheckedCreateNestedManyWithoutSiteInput = {
    create?: XOR<DocumentsCreateWithoutSiteInput, DocumentsUncheckedCreateWithoutSiteInput> | DocumentsCreateWithoutSiteInput[] | DocumentsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutSiteInput | DocumentsCreateOrConnectWithoutSiteInput[]
    createMany?: DocumentsCreateManySiteInputEnvelope
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
  }

  export type sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput = {
    create?: XOR<sitediaryrecordsCreateWithoutSiteInput, sitediaryrecordsUncheckedCreateWithoutSiteInput> | sitediaryrecordsCreateWithoutSiteInput[] | sitediaryrecordsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutSiteInput | sitediaryrecordsCreateOrConnectWithoutSiteInput[]
    createMany?: sitediaryrecordsCreateManySiteInputEnvelope
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
  }

  export type AIconversationUncheckedCreateNestedOneWithoutSiteInput = {
    create?: XOR<AIconversationCreateWithoutSiteInput, AIconversationUncheckedCreateWithoutSiteInput>
    connectOrCreate?: AIconversationCreateOrConnectWithoutSiteInput
    connect?: AIconversationWhereUniqueInput
  }

  export type sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput = {
    create?: XOR<sitediarysettingsCreateWithoutSiteInput, sitediarysettingsUncheckedCreateWithoutSiteInput>
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutSiteInput
    connect?: sitediarysettingsWhereUniqueInput
  }

  export type UserUpdateOneWithoutSiteNestedInput = {
    create?: XOR<UserCreateWithoutSiteInput, UserUncheckedCreateWithoutSiteInput>
    connectOrCreate?: UserCreateOrConnectWithoutSiteInput
    upsert?: UserUpsertWithoutSiteInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSiteInput, UserUpdateWithoutSiteInput>, UserUncheckedUpdateWithoutSiteInput>
  }

  export type PostUpdateManyWithoutSiteNestedInput = {
    create?: XOR<PostCreateWithoutSiteInput, PostUncheckedCreateWithoutSiteInput> | PostCreateWithoutSiteInput[] | PostUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: PostCreateOrConnectWithoutSiteInput | PostCreateOrConnectWithoutSiteInput[]
    upsert?: PostUpsertWithWhereUniqueWithoutSiteInput | PostUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: PostCreateManySiteInputEnvelope
    set?: PostWhereUniqueInput | PostWhereUniqueInput[]
    disconnect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    delete?: PostWhereUniqueInput | PostWhereUniqueInput[]
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    update?: PostUpdateWithWhereUniqueWithoutSiteInput | PostUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: PostUpdateManyWithWhereWithoutSiteInput | PostUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: PostScalarWhereInput | PostScalarWhereInput[]
  }

  export type InvoicesUpdateManyWithoutSiteNestedInput = {
    create?: XOR<InvoicesCreateWithoutSiteInput, InvoicesUncheckedCreateWithoutSiteInput> | InvoicesCreateWithoutSiteInput[] | InvoicesUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutSiteInput | InvoicesCreateOrConnectWithoutSiteInput[]
    upsert?: InvoicesUpsertWithWhereUniqueWithoutSiteInput | InvoicesUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: InvoicesCreateManySiteInputEnvelope
    set?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    disconnect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    delete?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    update?: InvoicesUpdateWithWhereUniqueWithoutSiteInput | InvoicesUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: InvoicesUpdateManyWithWhereWithoutSiteInput | InvoicesUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: InvoicesScalarWhereInput | InvoicesScalarWhereInput[]
  }

  export type InvoiceItemsUpdateManyWithoutSiteNestedInput = {
    create?: XOR<InvoiceItemsCreateWithoutSiteInput, InvoiceItemsUncheckedCreateWithoutSiteInput> | InvoiceItemsCreateWithoutSiteInput[] | InvoiceItemsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutSiteInput | InvoiceItemsCreateOrConnectWithoutSiteInput[]
    upsert?: InvoiceItemsUpsertWithWhereUniqueWithoutSiteInput | InvoiceItemsUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: InvoiceItemsCreateManySiteInputEnvelope
    set?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    disconnect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    delete?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    update?: InvoiceItemsUpdateWithWhereUniqueWithoutSiteInput | InvoiceItemsUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: InvoiceItemsUpdateManyWithWhereWithoutSiteInput | InvoiceItemsUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: InvoiceItemsScalarWhereInput | InvoiceItemsScalarWhereInput[]
  }

  export type DocumentsUpdateManyWithoutSiteNestedInput = {
    create?: XOR<DocumentsCreateWithoutSiteInput, DocumentsUncheckedCreateWithoutSiteInput> | DocumentsCreateWithoutSiteInput[] | DocumentsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutSiteInput | DocumentsCreateOrConnectWithoutSiteInput[]
    upsert?: DocumentsUpsertWithWhereUniqueWithoutSiteInput | DocumentsUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: DocumentsCreateManySiteInputEnvelope
    set?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    disconnect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    delete?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    update?: DocumentsUpdateWithWhereUniqueWithoutSiteInput | DocumentsUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: DocumentsUpdateManyWithWhereWithoutSiteInput | DocumentsUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: DocumentsScalarWhereInput | DocumentsScalarWhereInput[]
  }

  export type sitediaryrecordsUpdateManyWithoutSiteNestedInput = {
    create?: XOR<sitediaryrecordsCreateWithoutSiteInput, sitediaryrecordsUncheckedCreateWithoutSiteInput> | sitediaryrecordsCreateWithoutSiteInput[] | sitediaryrecordsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutSiteInput | sitediaryrecordsCreateOrConnectWithoutSiteInput[]
    upsert?: sitediaryrecordsUpsertWithWhereUniqueWithoutSiteInput | sitediaryrecordsUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: sitediaryrecordsCreateManySiteInputEnvelope
    set?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    disconnect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    delete?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    update?: sitediaryrecordsUpdateWithWhereUniqueWithoutSiteInput | sitediaryrecordsUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: sitediaryrecordsUpdateManyWithWhereWithoutSiteInput | sitediaryrecordsUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: sitediaryrecordsScalarWhereInput | sitediaryrecordsScalarWhereInput[]
  }

  export type AIconversationUpdateOneWithoutSiteNestedInput = {
    create?: XOR<AIconversationCreateWithoutSiteInput, AIconversationUncheckedCreateWithoutSiteInput>
    connectOrCreate?: AIconversationCreateOrConnectWithoutSiteInput
    upsert?: AIconversationUpsertWithoutSiteInput
    disconnect?: AIconversationWhereInput | boolean
    delete?: AIconversationWhereInput | boolean
    connect?: AIconversationWhereUniqueInput
    update?: XOR<XOR<AIconversationUpdateToOneWithWhereWithoutSiteInput, AIconversationUpdateWithoutSiteInput>, AIconversationUncheckedUpdateWithoutSiteInput>
  }

  export type sitediarysettingsUpdateOneWithoutSiteNestedInput = {
    create?: XOR<sitediarysettingsCreateWithoutSiteInput, sitediarysettingsUncheckedCreateWithoutSiteInput>
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutSiteInput
    upsert?: sitediarysettingsUpsertWithoutSiteInput
    disconnect?: sitediarysettingsWhereInput | boolean
    delete?: sitediarysettingsWhereInput | boolean
    connect?: sitediarysettingsWhereUniqueInput
    update?: XOR<XOR<sitediarysettingsUpdateToOneWithWhereWithoutSiteInput, sitediarysettingsUpdateWithoutSiteInput>, sitediarysettingsUncheckedUpdateWithoutSiteInput>
  }

  export type PostUncheckedUpdateManyWithoutSiteNestedInput = {
    create?: XOR<PostCreateWithoutSiteInput, PostUncheckedCreateWithoutSiteInput> | PostCreateWithoutSiteInput[] | PostUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: PostCreateOrConnectWithoutSiteInput | PostCreateOrConnectWithoutSiteInput[]
    upsert?: PostUpsertWithWhereUniqueWithoutSiteInput | PostUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: PostCreateManySiteInputEnvelope
    set?: PostWhereUniqueInput | PostWhereUniqueInput[]
    disconnect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    delete?: PostWhereUniqueInput | PostWhereUniqueInput[]
    connect?: PostWhereUniqueInput | PostWhereUniqueInput[]
    update?: PostUpdateWithWhereUniqueWithoutSiteInput | PostUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: PostUpdateManyWithWhereWithoutSiteInput | PostUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: PostScalarWhereInput | PostScalarWhereInput[]
  }

  export type InvoicesUncheckedUpdateManyWithoutSiteNestedInput = {
    create?: XOR<InvoicesCreateWithoutSiteInput, InvoicesUncheckedCreateWithoutSiteInput> | InvoicesCreateWithoutSiteInput[] | InvoicesUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoicesCreateOrConnectWithoutSiteInput | InvoicesCreateOrConnectWithoutSiteInput[]
    upsert?: InvoicesUpsertWithWhereUniqueWithoutSiteInput | InvoicesUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: InvoicesCreateManySiteInputEnvelope
    set?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    disconnect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    delete?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    connect?: InvoicesWhereUniqueInput | InvoicesWhereUniqueInput[]
    update?: InvoicesUpdateWithWhereUniqueWithoutSiteInput | InvoicesUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: InvoicesUpdateManyWithWhereWithoutSiteInput | InvoicesUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: InvoicesScalarWhereInput | InvoicesScalarWhereInput[]
  }

  export type InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput = {
    create?: XOR<InvoiceItemsCreateWithoutSiteInput, InvoiceItemsUncheckedCreateWithoutSiteInput> | InvoiceItemsCreateWithoutSiteInput[] | InvoiceItemsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutSiteInput | InvoiceItemsCreateOrConnectWithoutSiteInput[]
    upsert?: InvoiceItemsUpsertWithWhereUniqueWithoutSiteInput | InvoiceItemsUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: InvoiceItemsCreateManySiteInputEnvelope
    set?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    disconnect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    delete?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    update?: InvoiceItemsUpdateWithWhereUniqueWithoutSiteInput | InvoiceItemsUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: InvoiceItemsUpdateManyWithWhereWithoutSiteInput | InvoiceItemsUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: InvoiceItemsScalarWhereInput | InvoiceItemsScalarWhereInput[]
  }

  export type DocumentsUncheckedUpdateManyWithoutSiteNestedInput = {
    create?: XOR<DocumentsCreateWithoutSiteInput, DocumentsUncheckedCreateWithoutSiteInput> | DocumentsCreateWithoutSiteInput[] | DocumentsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: DocumentsCreateOrConnectWithoutSiteInput | DocumentsCreateOrConnectWithoutSiteInput[]
    upsert?: DocumentsUpsertWithWhereUniqueWithoutSiteInput | DocumentsUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: DocumentsCreateManySiteInputEnvelope
    set?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    disconnect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    delete?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    connect?: DocumentsWhereUniqueInput | DocumentsWhereUniqueInput[]
    update?: DocumentsUpdateWithWhereUniqueWithoutSiteInput | DocumentsUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: DocumentsUpdateManyWithWhereWithoutSiteInput | DocumentsUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: DocumentsScalarWhereInput | DocumentsScalarWhereInput[]
  }

  export type sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput = {
    create?: XOR<sitediaryrecordsCreateWithoutSiteInput, sitediaryrecordsUncheckedCreateWithoutSiteInput> | sitediaryrecordsCreateWithoutSiteInput[] | sitediaryrecordsUncheckedCreateWithoutSiteInput[]
    connectOrCreate?: sitediaryrecordsCreateOrConnectWithoutSiteInput | sitediaryrecordsCreateOrConnectWithoutSiteInput[]
    upsert?: sitediaryrecordsUpsertWithWhereUniqueWithoutSiteInput | sitediaryrecordsUpsertWithWhereUniqueWithoutSiteInput[]
    createMany?: sitediaryrecordsCreateManySiteInputEnvelope
    set?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    disconnect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    delete?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    connect?: sitediaryrecordsWhereUniqueInput | sitediaryrecordsWhereUniqueInput[]
    update?: sitediaryrecordsUpdateWithWhereUniqueWithoutSiteInput | sitediaryrecordsUpdateWithWhereUniqueWithoutSiteInput[]
    updateMany?: sitediaryrecordsUpdateManyWithWhereWithoutSiteInput | sitediaryrecordsUpdateManyWithWhereWithoutSiteInput[]
    deleteMany?: sitediaryrecordsScalarWhereInput | sitediaryrecordsScalarWhereInput[]
  }

  export type AIconversationUncheckedUpdateOneWithoutSiteNestedInput = {
    create?: XOR<AIconversationCreateWithoutSiteInput, AIconversationUncheckedCreateWithoutSiteInput>
    connectOrCreate?: AIconversationCreateOrConnectWithoutSiteInput
    upsert?: AIconversationUpsertWithoutSiteInput
    disconnect?: AIconversationWhereInput | boolean
    delete?: AIconversationWhereInput | boolean
    connect?: AIconversationWhereUniqueInput
    update?: XOR<XOR<AIconversationUpdateToOneWithWhereWithoutSiteInput, AIconversationUpdateWithoutSiteInput>, AIconversationUncheckedUpdateWithoutSiteInput>
  }

  export type sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput = {
    create?: XOR<sitediarysettingsCreateWithoutSiteInput, sitediarysettingsUncheckedCreateWithoutSiteInput>
    connectOrCreate?: sitediarysettingsCreateOrConnectWithoutSiteInput
    upsert?: sitediarysettingsUpsertWithoutSiteInput
    disconnect?: sitediarysettingsWhereInput | boolean
    delete?: sitediarysettingsWhereInput | boolean
    connect?: sitediarysettingsWhereUniqueInput
    update?: XOR<XOR<sitediarysettingsUpdateToOneWithWhereWithoutSiteInput, sitediarysettingsUpdateWithoutSiteInput>, sitediarysettingsUncheckedUpdateWithoutSiteInput>
  }

  export type UserCreateNestedOneWithoutSubscriptionInput = {
    create?: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubscriptionInput
    connect?: UserWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type UserUpdateOneWithoutSubscriptionNestedInput = {
    create?: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubscriptionInput
    upsert?: UserUpsertWithoutSubscriptionInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSubscriptionInput, UserUpdateWithoutSubscriptionInput>, UserUncheckedUpdateWithoutSubscriptionInput>
  }

  export type UserCreateNestedOneWithoutInvoicesInput = {
    create?: XOR<UserCreateWithoutInvoicesInput, UserUncheckedCreateWithoutInvoicesInput>
    connectOrCreate?: UserCreateOrConnectWithoutInvoicesInput
    connect?: UserWhereUniqueInput
  }

  export type SiteCreateNestedOneWithoutInvoicesInput = {
    create?: XOR<SiteCreateWithoutInvoicesInput, SiteUncheckedCreateWithoutInvoicesInput>
    connectOrCreate?: SiteCreateOrConnectWithoutInvoicesInput
    connect?: SiteWhereUniqueInput
  }

  export type InvoiceItemsCreateNestedManyWithoutInvoiceInput = {
    create?: XOR<InvoiceItemsCreateWithoutInvoiceInput, InvoiceItemsUncheckedCreateWithoutInvoiceInput> | InvoiceItemsCreateWithoutInvoiceInput[] | InvoiceItemsUncheckedCreateWithoutInvoiceInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutInvoiceInput | InvoiceItemsCreateOrConnectWithoutInvoiceInput[]
    createMany?: InvoiceItemsCreateManyInvoiceInputEnvelope
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
  }

  export type InvoiceItemsUncheckedCreateNestedManyWithoutInvoiceInput = {
    create?: XOR<InvoiceItemsCreateWithoutInvoiceInput, InvoiceItemsUncheckedCreateWithoutInvoiceInput> | InvoiceItemsCreateWithoutInvoiceInput[] | InvoiceItemsUncheckedCreateWithoutInvoiceInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutInvoiceInput | InvoiceItemsCreateOrConnectWithoutInvoiceInput[]
    createMany?: InvoiceItemsCreateManyInvoiceInputEnvelope
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type UserUpdateOneWithoutInvoicesNestedInput = {
    create?: XOR<UserCreateWithoutInvoicesInput, UserUncheckedCreateWithoutInvoicesInput>
    connectOrCreate?: UserCreateOrConnectWithoutInvoicesInput
    upsert?: UserUpsertWithoutInvoicesInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutInvoicesInput, UserUpdateWithoutInvoicesInput>, UserUncheckedUpdateWithoutInvoicesInput>
  }

  export type SiteUpdateOneWithoutInvoicesNestedInput = {
    create?: XOR<SiteCreateWithoutInvoicesInput, SiteUncheckedCreateWithoutInvoicesInput>
    connectOrCreate?: SiteCreateOrConnectWithoutInvoicesInput
    upsert?: SiteUpsertWithoutInvoicesInput
    disconnect?: SiteWhereInput | boolean
    delete?: SiteWhereInput | boolean
    connect?: SiteWhereUniqueInput
    update?: XOR<XOR<SiteUpdateToOneWithWhereWithoutInvoicesInput, SiteUpdateWithoutInvoicesInput>, SiteUncheckedUpdateWithoutInvoicesInput>
  }

  export type InvoiceItemsUpdateManyWithoutInvoiceNestedInput = {
    create?: XOR<InvoiceItemsCreateWithoutInvoiceInput, InvoiceItemsUncheckedCreateWithoutInvoiceInput> | InvoiceItemsCreateWithoutInvoiceInput[] | InvoiceItemsUncheckedCreateWithoutInvoiceInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutInvoiceInput | InvoiceItemsCreateOrConnectWithoutInvoiceInput[]
    upsert?: InvoiceItemsUpsertWithWhereUniqueWithoutInvoiceInput | InvoiceItemsUpsertWithWhereUniqueWithoutInvoiceInput[]
    createMany?: InvoiceItemsCreateManyInvoiceInputEnvelope
    set?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    disconnect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    delete?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    update?: InvoiceItemsUpdateWithWhereUniqueWithoutInvoiceInput | InvoiceItemsUpdateWithWhereUniqueWithoutInvoiceInput[]
    updateMany?: InvoiceItemsUpdateManyWithWhereWithoutInvoiceInput | InvoiceItemsUpdateManyWithWhereWithoutInvoiceInput[]
    deleteMany?: InvoiceItemsScalarWhereInput | InvoiceItemsScalarWhereInput[]
  }

  export type InvoiceItemsUncheckedUpdateManyWithoutInvoiceNestedInput = {
    create?: XOR<InvoiceItemsCreateWithoutInvoiceInput, InvoiceItemsUncheckedCreateWithoutInvoiceInput> | InvoiceItemsCreateWithoutInvoiceInput[] | InvoiceItemsUncheckedCreateWithoutInvoiceInput[]
    connectOrCreate?: InvoiceItemsCreateOrConnectWithoutInvoiceInput | InvoiceItemsCreateOrConnectWithoutInvoiceInput[]
    upsert?: InvoiceItemsUpsertWithWhereUniqueWithoutInvoiceInput | InvoiceItemsUpsertWithWhereUniqueWithoutInvoiceInput[]
    createMany?: InvoiceItemsCreateManyInvoiceInputEnvelope
    set?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    disconnect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    delete?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    connect?: InvoiceItemsWhereUniqueInput | InvoiceItemsWhereUniqueInput[]
    update?: InvoiceItemsUpdateWithWhereUniqueWithoutInvoiceInput | InvoiceItemsUpdateWithWhereUniqueWithoutInvoiceInput[]
    updateMany?: InvoiceItemsUpdateManyWithWhereWithoutInvoiceInput | InvoiceItemsUpdateManyWithWhereWithoutInvoiceInput[]
    deleteMany?: InvoiceItemsScalarWhereInput | InvoiceItemsScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutPostsInput = {
    create?: XOR<UserCreateWithoutPostsInput, UserUncheckedCreateWithoutPostsInput>
    connectOrCreate?: UserCreateOrConnectWithoutPostsInput
    connect?: UserWhereUniqueInput
  }

  export type SiteCreateNestedOneWithoutPostsInput = {
    create?: XOR<SiteCreateWithoutPostsInput, SiteUncheckedCreateWithoutPostsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutPostsInput
    connect?: SiteWhereUniqueInput
  }

  export type UserUpdateOneWithoutPostsNestedInput = {
    create?: XOR<UserCreateWithoutPostsInput, UserUncheckedCreateWithoutPostsInput>
    connectOrCreate?: UserCreateOrConnectWithoutPostsInput
    upsert?: UserUpsertWithoutPostsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutPostsInput, UserUpdateWithoutPostsInput>, UserUncheckedUpdateWithoutPostsInput>
  }

  export type SiteUpdateOneWithoutPostsNestedInput = {
    create?: XOR<SiteCreateWithoutPostsInput, SiteUncheckedCreateWithoutPostsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutPostsInput
    upsert?: SiteUpsertWithoutPostsInput
    disconnect?: SiteWhereInput | boolean
    delete?: SiteWhereInput | boolean
    connect?: SiteWhereUniqueInput
    update?: XOR<XOR<SiteUpdateToOneWithWhereWithoutPostsInput, SiteUpdateWithoutPostsInput>, SiteUncheckedUpdateWithoutPostsInput>
  }

  export type InvoicesCreateNestedOneWithoutItemsInput = {
    create?: XOR<InvoicesCreateWithoutItemsInput, InvoicesUncheckedCreateWithoutItemsInput>
    connectOrCreate?: InvoicesCreateOrConnectWithoutItemsInput
    connect?: InvoicesWhereUniqueInput
  }

  export type SiteCreateNestedOneWithoutInvoiceItemsInput = {
    create?: XOR<SiteCreateWithoutInvoiceItemsInput, SiteUncheckedCreateWithoutInvoiceItemsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutInvoiceItemsInput
    connect?: SiteWhereUniqueInput
  }

  export type InvoicesUpdateOneRequiredWithoutItemsNestedInput = {
    create?: XOR<InvoicesCreateWithoutItemsInput, InvoicesUncheckedCreateWithoutItemsInput>
    connectOrCreate?: InvoicesCreateOrConnectWithoutItemsInput
    upsert?: InvoicesUpsertWithoutItemsInput
    connect?: InvoicesWhereUniqueInput
    update?: XOR<XOR<InvoicesUpdateToOneWithWhereWithoutItemsInput, InvoicesUpdateWithoutItemsInput>, InvoicesUncheckedUpdateWithoutItemsInput>
  }

  export type SiteUpdateOneWithoutInvoiceItemsNestedInput = {
    create?: XOR<SiteCreateWithoutInvoiceItemsInput, SiteUncheckedCreateWithoutInvoiceItemsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutInvoiceItemsInput
    upsert?: SiteUpsertWithoutInvoiceItemsInput
    disconnect?: SiteWhereInput | boolean
    delete?: SiteWhereInput | boolean
    connect?: SiteWhereUniqueInput
    update?: XOR<XOR<SiteUpdateToOneWithWhereWithoutInvoiceItemsInput, SiteUpdateWithoutInvoiceItemsInput>, SiteUncheckedUpdateWithoutInvoiceItemsInput>
  }

  export type UserCreateNestedOneWithoutAIconversationInput = {
    create?: XOR<UserCreateWithoutAIconversationInput, UserUncheckedCreateWithoutAIconversationInput>
    connectOrCreate?: UserCreateOrConnectWithoutAIconversationInput
    connect?: UserWhereUniqueInput
  }

  export type SiteCreateNestedOneWithoutAIconversationInput = {
    create?: XOR<SiteCreateWithoutAIconversationInput, SiteUncheckedCreateWithoutAIconversationInput>
    connectOrCreate?: SiteCreateOrConnectWithoutAIconversationInput
    connect?: SiteWhereUniqueInput
  }

  export type UserUpdateOneWithoutAIconversationNestedInput = {
    create?: XOR<UserCreateWithoutAIconversationInput, UserUncheckedCreateWithoutAIconversationInput>
    connectOrCreate?: UserCreateOrConnectWithoutAIconversationInput
    upsert?: UserUpsertWithoutAIconversationInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAIconversationInput, UserUpdateWithoutAIconversationInput>, UserUncheckedUpdateWithoutAIconversationInput>
  }

  export type SiteUpdateOneWithoutAIconversationNestedInput = {
    create?: XOR<SiteCreateWithoutAIconversationInput, SiteUncheckedCreateWithoutAIconversationInput>
    connectOrCreate?: SiteCreateOrConnectWithoutAIconversationInput
    upsert?: SiteUpsertWithoutAIconversationInput
    disconnect?: SiteWhereInput | boolean
    delete?: SiteWhereInput | boolean
    connect?: SiteWhereUniqueInput
    update?: XOR<XOR<SiteUpdateToOneWithWhereWithoutAIconversationInput, SiteUpdateWithoutAIconversationInput>, SiteUncheckedUpdateWithoutAIconversationInput>
  }

  export type UserCreateNestedOneWithoutDocumentsInput = {
    create?: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDocumentsInput
    connect?: UserWhereUniqueInput
  }

  export type SiteCreateNestedOneWithoutDocumentsInput = {
    create?: XOR<SiteCreateWithoutDocumentsInput, SiteUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutDocumentsInput
    connect?: SiteWhereUniqueInput
  }

  export type UserUpdateOneWithoutDocumentsNestedInput = {
    create?: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: UserCreateOrConnectWithoutDocumentsInput
    upsert?: UserUpsertWithoutDocumentsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutDocumentsInput, UserUpdateWithoutDocumentsInput>, UserUncheckedUpdateWithoutDocumentsInput>
  }

  export type SiteUpdateOneWithoutDocumentsNestedInput = {
    create?: XOR<SiteCreateWithoutDocumentsInput, SiteUncheckedCreateWithoutDocumentsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutDocumentsInput
    upsert?: SiteUpsertWithoutDocumentsInput
    disconnect?: SiteWhereInput | boolean
    delete?: SiteWhereInput | boolean
    connect?: SiteWhereUniqueInput
    update?: XOR<XOR<SiteUpdateToOneWithWhereWithoutDocumentsInput, SiteUpdateWithoutDocumentsInput>, SiteUncheckedUpdateWithoutDocumentsInput>
  }

  export type sitediaryrecordsCreatePhotosInput = {
    set: string[]
  }

  export type UserCreateNestedOneWithoutSitediaryrecordsInput = {
    create?: XOR<UserCreateWithoutSitediaryrecordsInput, UserUncheckedCreateWithoutSitediaryrecordsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSitediaryrecordsInput
    connect?: UserWhereUniqueInput
  }

  export type SiteCreateNestedOneWithoutSitediaryrecordsInput = {
    create?: XOR<SiteCreateWithoutSitediaryrecordsInput, SiteUncheckedCreateWithoutSitediaryrecordsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutSitediaryrecordsInput
    connect?: SiteWhereUniqueInput
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type sitediaryrecordsUpdatePhotosInput = {
    set?: string[]
    push?: string | string[]
  }

  export type UserUpdateOneWithoutSitediaryrecordsNestedInput = {
    create?: XOR<UserCreateWithoutSitediaryrecordsInput, UserUncheckedCreateWithoutSitediaryrecordsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSitediaryrecordsInput
    upsert?: UserUpsertWithoutSitediaryrecordsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSitediaryrecordsInput, UserUpdateWithoutSitediaryrecordsInput>, UserUncheckedUpdateWithoutSitediaryrecordsInput>
  }

  export type SiteUpdateOneWithoutSitediaryrecordsNestedInput = {
    create?: XOR<SiteCreateWithoutSitediaryrecordsInput, SiteUncheckedCreateWithoutSitediaryrecordsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutSitediaryrecordsInput
    upsert?: SiteUpsertWithoutSitediaryrecordsInput
    disconnect?: SiteWhereInput | boolean
    delete?: SiteWhereInput | boolean
    connect?: SiteWhereUniqueInput
    update?: XOR<XOR<SiteUpdateToOneWithWhereWithoutSitediaryrecordsInput, SiteUpdateWithoutSitediaryrecordsInput>, SiteUncheckedUpdateWithoutSitediaryrecordsInput>
  }

  export type UserCreateNestedOneWithoutSitediarysettingsInput = {
    create?: XOR<UserCreateWithoutSitediarysettingsInput, UserUncheckedCreateWithoutSitediarysettingsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSitediarysettingsInput
    connect?: UserWhereUniqueInput
  }

  export type SiteCreateNestedOneWithoutSitediarysettingsInput = {
    create?: XOR<SiteCreateWithoutSitediarysettingsInput, SiteUncheckedCreateWithoutSitediarysettingsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutSitediarysettingsInput
    connect?: SiteWhereUniqueInput
  }

  export type UserUpdateOneWithoutSitediarysettingsNestedInput = {
    create?: XOR<UserCreateWithoutSitediarysettingsInput, UserUncheckedCreateWithoutSitediarysettingsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSitediarysettingsInput
    upsert?: UserUpsertWithoutSitediarysettingsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSitediarysettingsInput, UserUpdateWithoutSitediarysettingsInput>, UserUncheckedUpdateWithoutSitediarysettingsInput>
  }

  export type SiteUpdateOneWithoutSitediarysettingsNestedInput = {
    create?: XOR<SiteCreateWithoutSitediarysettingsInput, SiteUncheckedCreateWithoutSitediarysettingsInput>
    connectOrCreate?: SiteCreateOrConnectWithoutSitediarysettingsInput
    upsert?: SiteUpsertWithoutSitediarysettingsInput
    disconnect?: SiteWhereInput | boolean
    delete?: SiteWhereInput | boolean
    connect?: SiteWhereUniqueInput
    update?: XOR<XOR<SiteUpdateToOneWithWhereWithoutSitediarysettingsInput, SiteUpdateWithoutSitediarysettingsInput>, SiteUncheckedUpdateWithoutSitediarysettingsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type SiteCreateWithoutUserInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    posts?: PostCreateNestedManyWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutUserInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutUserInput, SiteUncheckedCreateWithoutUserInput>
  }

  export type SiteCreateManyUserInputEnvelope = {
    data: SiteCreateManyUserInput | SiteCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type PostCreateWithoutUserInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    Site?: SiteCreateNestedOneWithoutPostsInput
  }

  export type PostUncheckedCreateWithoutUserInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    siteId?: string | null
  }

  export type PostCreateOrConnectWithoutUserInput = {
    where: PostWhereUniqueInput
    create: XOR<PostCreateWithoutUserInput, PostUncheckedCreateWithoutUserInput>
  }

  export type PostCreateManyUserInputEnvelope = {
    data: PostCreateManyUserInput | PostCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type InvoicesCreateWithoutUserInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    Site?: SiteCreateNestedOneWithoutInvoicesInput
    items?: InvoiceItemsCreateNestedManyWithoutInvoiceInput
  }

  export type InvoicesUncheckedCreateWithoutUserInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    SiteId?: string | null
    items?: InvoiceItemsUncheckedCreateNestedManyWithoutInvoiceInput
  }

  export type InvoicesCreateOrConnectWithoutUserInput = {
    where: InvoicesWhereUniqueInput
    create: XOR<InvoicesCreateWithoutUserInput, InvoicesUncheckedCreateWithoutUserInput>
  }

  export type InvoicesCreateManyUserInputEnvelope = {
    data: InvoicesCreateManyUserInput | InvoicesCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type DocumentsCreateWithoutUserInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    Site?: SiteCreateNestedOneWithoutDocumentsInput
  }

  export type DocumentsUncheckedCreateWithoutUserInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    siteId?: string | null
  }

  export type DocumentsCreateOrConnectWithoutUserInput = {
    where: DocumentsWhereUniqueInput
    create: XOR<DocumentsCreateWithoutUserInput, DocumentsUncheckedCreateWithoutUserInput>
  }

  export type DocumentsCreateManyUserInputEnvelope = {
    data: DocumentsCreateManyUserInput | DocumentsCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type sitediaryrecordsCreateWithoutUserInput = {
    id?: string
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
    Site?: SiteCreateNestedOneWithoutSitediaryrecordsInput
  }

  export type sitediaryrecordsUncheckedCreateWithoutUserInput = {
    id?: string
    siteId?: string | null
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
  }

  export type sitediaryrecordsCreateOrConnectWithoutUserInput = {
    where: sitediaryrecordsWhereUniqueInput
    create: XOR<sitediaryrecordsCreateWithoutUserInput, sitediaryrecordsUncheckedCreateWithoutUserInput>
  }

  export type sitediaryrecordsCreateManyUserInputEnvelope = {
    data: sitediaryrecordsCreateManyUserInput | sitediaryrecordsCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type SubscriptionCreateWithoutUserInput = {
    stripeSubscriptionId: string
    interval: string
    status: string
    planId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionUncheckedCreateWithoutUserInput = {
    stripeSubscriptionId: string
    interval: string
    status: string
    planId: string
    currentPeriodStart: number
    currentPeriodEnd: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SubscriptionCreateOrConnectWithoutUserInput = {
    where: SubscriptionWhereUniqueInput
    create: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
  }

  export type AIconversationCreateWithoutUserInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    site?: SiteCreateNestedOneWithoutAIconversationInput
  }

  export type AIconversationUncheckedCreateWithoutUserInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    siteId: string
  }

  export type AIconversationCreateOrConnectWithoutUserInput = {
    where: AIconversationWhereUniqueInput
    create: XOR<AIconversationCreateWithoutUserInput, AIconversationUncheckedCreateWithoutUserInput>
  }

  export type AIconversationCreateManyUserInputEnvelope = {
    data: AIconversationCreateManyUserInput | AIconversationCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type sitediarysettingsCreateWithoutUserInput = {
    id?: string
    fileUrl?: string | null
    schema?: string | null
    Site?: SiteCreateNestedOneWithoutSitediarysettingsInput
  }

  export type sitediarysettingsUncheckedCreateWithoutUserInput = {
    id?: string
    fileUrl?: string | null
    siteId?: string | null
    schema?: string | null
  }

  export type sitediarysettingsCreateOrConnectWithoutUserInput = {
    where: sitediarysettingsWhereUniqueInput
    create: XOR<sitediarysettingsCreateWithoutUserInput, sitediarysettingsUncheckedCreateWithoutUserInput>
  }

  export type sitediarysettingsCreateManyUserInputEnvelope = {
    data: sitediarysettingsCreateManyUserInput | sitediarysettingsCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type SiteUpsertWithWhereUniqueWithoutUserInput = {
    where: SiteWhereUniqueInput
    update: XOR<SiteUpdateWithoutUserInput, SiteUncheckedUpdateWithoutUserInput>
    create: XOR<SiteCreateWithoutUserInput, SiteUncheckedCreateWithoutUserInput>
  }

  export type SiteUpdateWithWhereUniqueWithoutUserInput = {
    where: SiteWhereUniqueInput
    data: XOR<SiteUpdateWithoutUserInput, SiteUncheckedUpdateWithoutUserInput>
  }

  export type SiteUpdateManyWithWhereWithoutUserInput = {
    where: SiteScalarWhereInput
    data: XOR<SiteUpdateManyMutationInput, SiteUncheckedUpdateManyWithoutUserInput>
  }

  export type SiteScalarWhereInput = {
    AND?: SiteScalarWhereInput | SiteScalarWhereInput[]
    OR?: SiteScalarWhereInput[]
    NOT?: SiteScalarWhereInput | SiteScalarWhereInput[]
    id?: StringFilter<"Site"> | string
    name?: StringFilter<"Site"> | string
    description?: StringFilter<"Site"> | string
    subdirectory?: StringFilter<"Site"> | string
    createdAt?: DateTimeFilter<"Site"> | Date | string
    updatedAt?: DateTimeFilter<"Site"> | Date | string
    imageUrl?: StringNullableFilter<"Site"> | string | null
    userId?: StringNullableFilter<"Site"> | string | null
  }

  export type PostUpsertWithWhereUniqueWithoutUserInput = {
    where: PostWhereUniqueInput
    update: XOR<PostUpdateWithoutUserInput, PostUncheckedUpdateWithoutUserInput>
    create: XOR<PostCreateWithoutUserInput, PostUncheckedCreateWithoutUserInput>
  }

  export type PostUpdateWithWhereUniqueWithoutUserInput = {
    where: PostWhereUniqueInput
    data: XOR<PostUpdateWithoutUserInput, PostUncheckedUpdateWithoutUserInput>
  }

  export type PostUpdateManyWithWhereWithoutUserInput = {
    where: PostScalarWhereInput
    data: XOR<PostUpdateManyMutationInput, PostUncheckedUpdateManyWithoutUserInput>
  }

  export type PostScalarWhereInput = {
    AND?: PostScalarWhereInput | PostScalarWhereInput[]
    OR?: PostScalarWhereInput[]
    NOT?: PostScalarWhereInput | PostScalarWhereInput[]
    id?: StringFilter<"Post"> | string
    title?: StringFilter<"Post"> | string
    articleContent?: JsonFilter<"Post">
    smallDescription?: StringFilter<"Post"> | string
    image?: StringFilter<"Post"> | string
    slug?: StringFilter<"Post"> | string
    createdAt?: DateTimeFilter<"Post"> | Date | string
    updatedAt?: DateTimeFilter<"Post"> | Date | string
    userId?: StringNullableFilter<"Post"> | string | null
    siteId?: StringNullableFilter<"Post"> | string | null
  }

  export type InvoicesUpsertWithWhereUniqueWithoutUserInput = {
    where: InvoicesWhereUniqueInput
    update: XOR<InvoicesUpdateWithoutUserInput, InvoicesUncheckedUpdateWithoutUserInput>
    create: XOR<InvoicesCreateWithoutUserInput, InvoicesUncheckedCreateWithoutUserInput>
  }

  export type InvoicesUpdateWithWhereUniqueWithoutUserInput = {
    where: InvoicesWhereUniqueInput
    data: XOR<InvoicesUpdateWithoutUserInput, InvoicesUncheckedUpdateWithoutUserInput>
  }

  export type InvoicesUpdateManyWithWhereWithoutUserInput = {
    where: InvoicesScalarWhereInput
    data: XOR<InvoicesUpdateManyMutationInput, InvoicesUncheckedUpdateManyWithoutUserInput>
  }

  export type InvoicesScalarWhereInput = {
    AND?: InvoicesScalarWhereInput | InvoicesScalarWhereInput[]
    OR?: InvoicesScalarWhereInput[]
    NOT?: InvoicesScalarWhereInput | InvoicesScalarWhereInput[]
    id?: StringFilter<"Invoices"> | string
    url?: StringFilter<"Invoices"> | string
    invoiceNumber?: StringNullableFilter<"Invoices"> | string | null
    sellerName?: StringNullableFilter<"Invoices"> | string | null
    invoiceTotalSumNoVat?: FloatNullableFilter<"Invoices"> | number | null
    invoiceTotalSumWithVat?: FloatNullableFilter<"Invoices"> | number | null
    buyerName?: StringNullableFilter<"Invoices"> | string | null
    invoiceDate?: StringNullableFilter<"Invoices"> | string | null
    paymentDate?: StringNullableFilter<"Invoices"> | string | null
    isInvoice?: BoolNullableFilter<"Invoices"> | boolean | null
    isCreditDebitProformaOrAdvanced?: StringNullableFilter<"Invoices"> | string | null
    uploadedAt?: DateTimeFilter<"Invoices"> | Date | string
    userId?: StringNullableFilter<"Invoices"> | string | null
    SiteId?: StringNullableFilter<"Invoices"> | string | null
  }

  export type DocumentsUpsertWithWhereUniqueWithoutUserInput = {
    where: DocumentsWhereUniqueInput
    update: XOR<DocumentsUpdateWithoutUserInput, DocumentsUncheckedUpdateWithoutUserInput>
    create: XOR<DocumentsCreateWithoutUserInput, DocumentsUncheckedCreateWithoutUserInput>
  }

  export type DocumentsUpdateWithWhereUniqueWithoutUserInput = {
    where: DocumentsWhereUniqueInput
    data: XOR<DocumentsUpdateWithoutUserInput, DocumentsUncheckedUpdateWithoutUserInput>
  }

  export type DocumentsUpdateManyWithWhereWithoutUserInput = {
    where: DocumentsScalarWhereInput
    data: XOR<DocumentsUpdateManyMutationInput, DocumentsUncheckedUpdateManyWithoutUserInput>
  }

  export type DocumentsScalarWhereInput = {
    AND?: DocumentsScalarWhereInput | DocumentsScalarWhereInput[]
    OR?: DocumentsScalarWhereInput[]
    NOT?: DocumentsScalarWhereInput | DocumentsScalarWhereInput[]
    id?: StringFilter<"Documents"> | string
    url?: StringFilter<"Documents"> | string
    documentType?: StringFilter<"Documents"> | string
    documentName?: StringFilter<"Documents"> | string
    description?: StringFilter<"Documents"> | string
    userId?: StringNullableFilter<"Documents"> | string | null
    siteId?: StringNullableFilter<"Documents"> | string | null
  }

  export type sitediaryrecordsUpsertWithWhereUniqueWithoutUserInput = {
    where: sitediaryrecordsWhereUniqueInput
    update: XOR<sitediaryrecordsUpdateWithoutUserInput, sitediaryrecordsUncheckedUpdateWithoutUserInput>
    create: XOR<sitediaryrecordsCreateWithoutUserInput, sitediaryrecordsUncheckedCreateWithoutUserInput>
  }

  export type sitediaryrecordsUpdateWithWhereUniqueWithoutUserInput = {
    where: sitediaryrecordsWhereUniqueInput
    data: XOR<sitediaryrecordsUpdateWithoutUserInput, sitediaryrecordsUncheckedUpdateWithoutUserInput>
  }

  export type sitediaryrecordsUpdateManyWithWhereWithoutUserInput = {
    where: sitediaryrecordsScalarWhereInput
    data: XOR<sitediaryrecordsUpdateManyMutationInput, sitediaryrecordsUncheckedUpdateManyWithoutUserInput>
  }

  export type sitediaryrecordsScalarWhereInput = {
    AND?: sitediaryrecordsScalarWhereInput | sitediaryrecordsScalarWhereInput[]
    OR?: sitediaryrecordsScalarWhereInput[]
    NOT?: sitediaryrecordsScalarWhereInput | sitediaryrecordsScalarWhereInput[]
    id?: StringFilter<"sitediaryrecords"> | string
    userId?: StringNullableFilter<"sitediaryrecords"> | string | null
    siteId?: StringNullableFilter<"sitediaryrecords"> | string | null
    Date?: DateTimeNullableFilter<"sitediaryrecords"> | Date | string | null
    Location?: StringNullableFilter<"sitediaryrecords"> | string | null
    Works?: StringNullableFilter<"sitediaryrecords"> | string | null
    Comments?: StringNullableFilter<"sitediaryrecords"> | string | null
    Units?: StringNullableFilter<"sitediaryrecords"> | string | null
    Amounts?: FloatNullableFilter<"sitediaryrecords"> | number | null
    WorkersInvolved?: IntNullableFilter<"sitediaryrecords"> | number | null
    TimeInvolved?: FloatNullableFilter<"sitediaryrecords"> | number | null
    Photos?: StringNullableListFilter<"sitediaryrecords">
  }

  export type SubscriptionUpsertWithoutUserInput = {
    update: XOR<SubscriptionUpdateWithoutUserInput, SubscriptionUncheckedUpdateWithoutUserInput>
    create: XOR<SubscriptionCreateWithoutUserInput, SubscriptionUncheckedCreateWithoutUserInput>
    where?: SubscriptionWhereInput
  }

  export type SubscriptionUpdateToOneWithWhereWithoutUserInput = {
    where?: SubscriptionWhereInput
    data: XOR<SubscriptionUpdateWithoutUserInput, SubscriptionUncheckedUpdateWithoutUserInput>
  }

  export type SubscriptionUpdateWithoutUserInput = {
    stripeSubscriptionId?: StringFieldUpdateOperationsInput | string
    interval?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: IntFieldUpdateOperationsInput | number
    currentPeriodEnd?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SubscriptionUncheckedUpdateWithoutUserInput = {
    stripeSubscriptionId?: StringFieldUpdateOperationsInput | string
    interval?: StringFieldUpdateOperationsInput | string
    status?: StringFieldUpdateOperationsInput | string
    planId?: StringFieldUpdateOperationsInput | string
    currentPeriodStart?: IntFieldUpdateOperationsInput | number
    currentPeriodEnd?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AIconversationUpsertWithWhereUniqueWithoutUserInput = {
    where: AIconversationWhereUniqueInput
    update: XOR<AIconversationUpdateWithoutUserInput, AIconversationUncheckedUpdateWithoutUserInput>
    create: XOR<AIconversationCreateWithoutUserInput, AIconversationUncheckedCreateWithoutUserInput>
  }

  export type AIconversationUpdateWithWhereUniqueWithoutUserInput = {
    where: AIconversationWhereUniqueInput
    data: XOR<AIconversationUpdateWithoutUserInput, AIconversationUncheckedUpdateWithoutUserInput>
  }

  export type AIconversationUpdateManyWithWhereWithoutUserInput = {
    where: AIconversationScalarWhereInput
    data: XOR<AIconversationUpdateManyMutationInput, AIconversationUncheckedUpdateManyWithoutUserInput>
  }

  export type AIconversationScalarWhereInput = {
    AND?: AIconversationScalarWhereInput | AIconversationScalarWhereInput[]
    OR?: AIconversationScalarWhereInput[]
    NOT?: AIconversationScalarWhereInput | AIconversationScalarWhereInput[]
    id?: StringFilter<"AIconversation"> | string
    thread?: JsonNullableFilter<"AIconversation">
    userId?: StringFilter<"AIconversation"> | string
    siteId?: StringFilter<"AIconversation"> | string
  }

  export type sitediarysettingsUpsertWithWhereUniqueWithoutUserInput = {
    where: sitediarysettingsWhereUniqueInput
    update: XOR<sitediarysettingsUpdateWithoutUserInput, sitediarysettingsUncheckedUpdateWithoutUserInput>
    create: XOR<sitediarysettingsCreateWithoutUserInput, sitediarysettingsUncheckedCreateWithoutUserInput>
  }

  export type sitediarysettingsUpdateWithWhereUniqueWithoutUserInput = {
    where: sitediarysettingsWhereUniqueInput
    data: XOR<sitediarysettingsUpdateWithoutUserInput, sitediarysettingsUncheckedUpdateWithoutUserInput>
  }

  export type sitediarysettingsUpdateManyWithWhereWithoutUserInput = {
    where: sitediarysettingsScalarWhereInput
    data: XOR<sitediarysettingsUpdateManyMutationInput, sitediarysettingsUncheckedUpdateManyWithoutUserInput>
  }

  export type sitediarysettingsScalarWhereInput = {
    AND?: sitediarysettingsScalarWhereInput | sitediarysettingsScalarWhereInput[]
    OR?: sitediarysettingsScalarWhereInput[]
    NOT?: sitediarysettingsScalarWhereInput | sitediarysettingsScalarWhereInput[]
    id?: StringFilter<"sitediarysettings"> | string
    userId?: StringNullableFilter<"sitediarysettings"> | string | null
    fileUrl?: StringNullableFilter<"sitediarysettings"> | string | null
    siteId?: StringNullableFilter<"sitediarysettings"> | string | null
    schema?: StringNullableFilter<"sitediarysettings"> | string | null
  }

  export type UserCreateWithoutSiteInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    posts?: PostCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSiteInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSiteInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSiteInput, UserUncheckedCreateWithoutSiteInput>
  }

  export type PostCreateWithoutSiteInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    User?: UserCreateNestedOneWithoutPostsInput
  }

  export type PostUncheckedCreateWithoutSiteInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    userId?: string | null
  }

  export type PostCreateOrConnectWithoutSiteInput = {
    where: PostWhereUniqueInput
    create: XOR<PostCreateWithoutSiteInput, PostUncheckedCreateWithoutSiteInput>
  }

  export type PostCreateManySiteInputEnvelope = {
    data: PostCreateManySiteInput | PostCreateManySiteInput[]
    skipDuplicates?: boolean
  }

  export type InvoicesCreateWithoutSiteInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    User?: UserCreateNestedOneWithoutInvoicesInput
    items?: InvoiceItemsCreateNestedManyWithoutInvoiceInput
  }

  export type InvoicesUncheckedCreateWithoutSiteInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    userId?: string | null
    items?: InvoiceItemsUncheckedCreateNestedManyWithoutInvoiceInput
  }

  export type InvoicesCreateOrConnectWithoutSiteInput = {
    where: InvoicesWhereUniqueInput
    create: XOR<InvoicesCreateWithoutSiteInput, InvoicesUncheckedCreateWithoutSiteInput>
  }

  export type InvoicesCreateManySiteInputEnvelope = {
    data: InvoicesCreateManySiteInput | InvoicesCreateManySiteInput[]
    skipDuplicates?: boolean
  }

  export type InvoiceItemsCreateWithoutSiteInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    invoice: InvoicesCreateNestedOneWithoutItemsInput
  }

  export type InvoiceItemsUncheckedCreateWithoutSiteInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    invoiceId: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
  }

  export type InvoiceItemsCreateOrConnectWithoutSiteInput = {
    where: InvoiceItemsWhereUniqueInput
    create: XOR<InvoiceItemsCreateWithoutSiteInput, InvoiceItemsUncheckedCreateWithoutSiteInput>
  }

  export type InvoiceItemsCreateManySiteInputEnvelope = {
    data: InvoiceItemsCreateManySiteInput | InvoiceItemsCreateManySiteInput[]
    skipDuplicates?: boolean
  }

  export type DocumentsCreateWithoutSiteInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    User?: UserCreateNestedOneWithoutDocumentsInput
  }

  export type DocumentsUncheckedCreateWithoutSiteInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    userId?: string | null
  }

  export type DocumentsCreateOrConnectWithoutSiteInput = {
    where: DocumentsWhereUniqueInput
    create: XOR<DocumentsCreateWithoutSiteInput, DocumentsUncheckedCreateWithoutSiteInput>
  }

  export type DocumentsCreateManySiteInputEnvelope = {
    data: DocumentsCreateManySiteInput | DocumentsCreateManySiteInput[]
    skipDuplicates?: boolean
  }

  export type sitediaryrecordsCreateWithoutSiteInput = {
    id?: string
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
    User?: UserCreateNestedOneWithoutSitediaryrecordsInput
  }

  export type sitediaryrecordsUncheckedCreateWithoutSiteInput = {
    id?: string
    userId?: string | null
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
  }

  export type sitediaryrecordsCreateOrConnectWithoutSiteInput = {
    where: sitediaryrecordsWhereUniqueInput
    create: XOR<sitediaryrecordsCreateWithoutSiteInput, sitediaryrecordsUncheckedCreateWithoutSiteInput>
  }

  export type sitediaryrecordsCreateManySiteInputEnvelope = {
    data: sitediaryrecordsCreateManySiteInput | sitediaryrecordsCreateManySiteInput[]
    skipDuplicates?: boolean
  }

  export type AIconversationCreateWithoutSiteInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    User?: UserCreateNestedOneWithoutAIconversationInput
  }

  export type AIconversationUncheckedCreateWithoutSiteInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    userId: string
  }

  export type AIconversationCreateOrConnectWithoutSiteInput = {
    where: AIconversationWhereUniqueInput
    create: XOR<AIconversationCreateWithoutSiteInput, AIconversationUncheckedCreateWithoutSiteInput>
  }

  export type sitediarysettingsCreateWithoutSiteInput = {
    id?: string
    fileUrl?: string | null
    schema?: string | null
    User?: UserCreateNestedOneWithoutSitediarysettingsInput
  }

  export type sitediarysettingsUncheckedCreateWithoutSiteInput = {
    id?: string
    userId?: string | null
    fileUrl?: string | null
    schema?: string | null
  }

  export type sitediarysettingsCreateOrConnectWithoutSiteInput = {
    where: sitediarysettingsWhereUniqueInput
    create: XOR<sitediarysettingsCreateWithoutSiteInput, sitediarysettingsUncheckedCreateWithoutSiteInput>
  }

  export type UserUpsertWithoutSiteInput = {
    update: XOR<UserUpdateWithoutSiteInput, UserUncheckedUpdateWithoutSiteInput>
    create: XOR<UserCreateWithoutSiteInput, UserUncheckedCreateWithoutSiteInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSiteInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSiteInput, UserUncheckedUpdateWithoutSiteInput>
  }

  export type UserUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    posts?: PostUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type PostUpsertWithWhereUniqueWithoutSiteInput = {
    where: PostWhereUniqueInput
    update: XOR<PostUpdateWithoutSiteInput, PostUncheckedUpdateWithoutSiteInput>
    create: XOR<PostCreateWithoutSiteInput, PostUncheckedCreateWithoutSiteInput>
  }

  export type PostUpdateWithWhereUniqueWithoutSiteInput = {
    where: PostWhereUniqueInput
    data: XOR<PostUpdateWithoutSiteInput, PostUncheckedUpdateWithoutSiteInput>
  }

  export type PostUpdateManyWithWhereWithoutSiteInput = {
    where: PostScalarWhereInput
    data: XOR<PostUpdateManyMutationInput, PostUncheckedUpdateManyWithoutSiteInput>
  }

  export type InvoicesUpsertWithWhereUniqueWithoutSiteInput = {
    where: InvoicesWhereUniqueInput
    update: XOR<InvoicesUpdateWithoutSiteInput, InvoicesUncheckedUpdateWithoutSiteInput>
    create: XOR<InvoicesCreateWithoutSiteInput, InvoicesUncheckedCreateWithoutSiteInput>
  }

  export type InvoicesUpdateWithWhereUniqueWithoutSiteInput = {
    where: InvoicesWhereUniqueInput
    data: XOR<InvoicesUpdateWithoutSiteInput, InvoicesUncheckedUpdateWithoutSiteInput>
  }

  export type InvoicesUpdateManyWithWhereWithoutSiteInput = {
    where: InvoicesScalarWhereInput
    data: XOR<InvoicesUpdateManyMutationInput, InvoicesUncheckedUpdateManyWithoutSiteInput>
  }

  export type InvoiceItemsUpsertWithWhereUniqueWithoutSiteInput = {
    where: InvoiceItemsWhereUniqueInput
    update: XOR<InvoiceItemsUpdateWithoutSiteInput, InvoiceItemsUncheckedUpdateWithoutSiteInput>
    create: XOR<InvoiceItemsCreateWithoutSiteInput, InvoiceItemsUncheckedCreateWithoutSiteInput>
  }

  export type InvoiceItemsUpdateWithWhereUniqueWithoutSiteInput = {
    where: InvoiceItemsWhereUniqueInput
    data: XOR<InvoiceItemsUpdateWithoutSiteInput, InvoiceItemsUncheckedUpdateWithoutSiteInput>
  }

  export type InvoiceItemsUpdateManyWithWhereWithoutSiteInput = {
    where: InvoiceItemsScalarWhereInput
    data: XOR<InvoiceItemsUpdateManyMutationInput, InvoiceItemsUncheckedUpdateManyWithoutSiteInput>
  }

  export type InvoiceItemsScalarWhereInput = {
    AND?: InvoiceItemsScalarWhereInput | InvoiceItemsScalarWhereInput[]
    OR?: InvoiceItemsScalarWhereInput[]
    NOT?: InvoiceItemsScalarWhereInput | InvoiceItemsScalarWhereInput[]
    id?: StringFilter<"InvoiceItems"> | string
    item?: StringNullableFilter<"InvoiceItems"> | string | null
    quantity?: FloatNullableFilter<"InvoiceItems"> | number | null
    unitOfMeasure?: StringNullableFilter<"InvoiceItems"> | string | null
    pricePerUnitOfMeasure?: FloatNullableFilter<"InvoiceItems"> | number | null
    sum?: FloatNullableFilter<"InvoiceItems"> | number | null
    currency?: StringNullableFilter<"InvoiceItems"> | string | null
    category?: StringNullableFilter<"InvoiceItems"> | string | null
    itemDescription?: StringNullableFilter<"InvoiceItems"> | string | null
    commentsForUser?: StringNullableFilter<"InvoiceItems"> | string | null
    isInvoice?: BoolNullableFilter<"InvoiceItems"> | boolean | null
    invoiceId?: StringFilter<"InvoiceItems"> | string
    siteId?: StringNullableFilter<"InvoiceItems"> | string | null
    invoiceNumber?: StringNullableFilter<"InvoiceItems"> | string | null
    sellerName?: StringNullableFilter<"InvoiceItems"> | string | null
    invoiceDate?: StringNullableFilter<"InvoiceItems"> | string | null
    paymentDate?: StringNullableFilter<"InvoiceItems"> | string | null
  }

  export type DocumentsUpsertWithWhereUniqueWithoutSiteInput = {
    where: DocumentsWhereUniqueInput
    update: XOR<DocumentsUpdateWithoutSiteInput, DocumentsUncheckedUpdateWithoutSiteInput>
    create: XOR<DocumentsCreateWithoutSiteInput, DocumentsUncheckedCreateWithoutSiteInput>
  }

  export type DocumentsUpdateWithWhereUniqueWithoutSiteInput = {
    where: DocumentsWhereUniqueInput
    data: XOR<DocumentsUpdateWithoutSiteInput, DocumentsUncheckedUpdateWithoutSiteInput>
  }

  export type DocumentsUpdateManyWithWhereWithoutSiteInput = {
    where: DocumentsScalarWhereInput
    data: XOR<DocumentsUpdateManyMutationInput, DocumentsUncheckedUpdateManyWithoutSiteInput>
  }

  export type sitediaryrecordsUpsertWithWhereUniqueWithoutSiteInput = {
    where: sitediaryrecordsWhereUniqueInput
    update: XOR<sitediaryrecordsUpdateWithoutSiteInput, sitediaryrecordsUncheckedUpdateWithoutSiteInput>
    create: XOR<sitediaryrecordsCreateWithoutSiteInput, sitediaryrecordsUncheckedCreateWithoutSiteInput>
  }

  export type sitediaryrecordsUpdateWithWhereUniqueWithoutSiteInput = {
    where: sitediaryrecordsWhereUniqueInput
    data: XOR<sitediaryrecordsUpdateWithoutSiteInput, sitediaryrecordsUncheckedUpdateWithoutSiteInput>
  }

  export type sitediaryrecordsUpdateManyWithWhereWithoutSiteInput = {
    where: sitediaryrecordsScalarWhereInput
    data: XOR<sitediaryrecordsUpdateManyMutationInput, sitediaryrecordsUncheckedUpdateManyWithoutSiteInput>
  }

  export type AIconversationUpsertWithoutSiteInput = {
    update: XOR<AIconversationUpdateWithoutSiteInput, AIconversationUncheckedUpdateWithoutSiteInput>
    create: XOR<AIconversationCreateWithoutSiteInput, AIconversationUncheckedCreateWithoutSiteInput>
    where?: AIconversationWhereInput
  }

  export type AIconversationUpdateToOneWithWhereWithoutSiteInput = {
    where?: AIconversationWhereInput
    data: XOR<AIconversationUpdateWithoutSiteInput, AIconversationUncheckedUpdateWithoutSiteInput>
  }

  export type AIconversationUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    User?: UserUpdateOneWithoutAIconversationNestedInput
  }

  export type AIconversationUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    userId?: StringFieldUpdateOperationsInput | string
  }

  export type sitediarysettingsUpsertWithoutSiteInput = {
    update: XOR<sitediarysettingsUpdateWithoutSiteInput, sitediarysettingsUncheckedUpdateWithoutSiteInput>
    create: XOR<sitediarysettingsCreateWithoutSiteInput, sitediarysettingsUncheckedCreateWithoutSiteInput>
    where?: sitediarysettingsWhereInput
  }

  export type sitediarysettingsUpdateToOneWithWhereWithoutSiteInput = {
    where?: sitediarysettingsWhereInput
    data: XOR<sitediarysettingsUpdateWithoutSiteInput, sitediarysettingsUncheckedUpdateWithoutSiteInput>
  }

  export type sitediarysettingsUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSitediarysettingsNestedInput
  }

  export type sitediarysettingsUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserCreateWithoutSubscriptionInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    posts?: PostCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSubscriptionInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSubscriptionInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
  }

  export type UserUpsertWithoutSubscriptionInput = {
    update: XOR<UserUpdateWithoutSubscriptionInput, UserUncheckedUpdateWithoutSubscriptionInput>
    create: XOR<UserCreateWithoutSubscriptionInput, UserUncheckedCreateWithoutSubscriptionInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSubscriptionInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSubscriptionInput, UserUncheckedUpdateWithoutSubscriptionInput>
  }

  export type UserUpdateWithoutSubscriptionInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    posts?: PostUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSubscriptionInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutInvoicesInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    posts?: PostCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutInvoicesInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutInvoicesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutInvoicesInput, UserUncheckedCreateWithoutInvoicesInput>
  }

  export type SiteCreateWithoutInvoicesInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    posts?: PostCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutInvoicesInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutInvoicesInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutInvoicesInput, SiteUncheckedCreateWithoutInvoicesInput>
  }

  export type InvoiceItemsCreateWithoutInvoiceInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    Site?: SiteCreateNestedOneWithoutInvoiceItemsInput
  }

  export type InvoiceItemsUncheckedCreateWithoutInvoiceInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    siteId?: string | null
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
  }

  export type InvoiceItemsCreateOrConnectWithoutInvoiceInput = {
    where: InvoiceItemsWhereUniqueInput
    create: XOR<InvoiceItemsCreateWithoutInvoiceInput, InvoiceItemsUncheckedCreateWithoutInvoiceInput>
  }

  export type InvoiceItemsCreateManyInvoiceInputEnvelope = {
    data: InvoiceItemsCreateManyInvoiceInput | InvoiceItemsCreateManyInvoiceInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutInvoicesInput = {
    update: XOR<UserUpdateWithoutInvoicesInput, UserUncheckedUpdateWithoutInvoicesInput>
    create: XOR<UserCreateWithoutInvoicesInput, UserUncheckedCreateWithoutInvoicesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutInvoicesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutInvoicesInput, UserUncheckedUpdateWithoutInvoicesInput>
  }

  export type UserUpdateWithoutInvoicesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    posts?: PostUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutInvoicesInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SiteUpsertWithoutInvoicesInput = {
    update: XOR<SiteUpdateWithoutInvoicesInput, SiteUncheckedUpdateWithoutInvoicesInput>
    create: XOR<SiteCreateWithoutInvoicesInput, SiteUncheckedCreateWithoutInvoicesInput>
    where?: SiteWhereInput
  }

  export type SiteUpdateToOneWithWhereWithoutInvoicesInput = {
    where?: SiteWhereInput
    data: XOR<SiteUpdateWithoutInvoicesInput, SiteUncheckedUpdateWithoutInvoicesInput>
  }

  export type SiteUpdateWithoutInvoicesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    posts?: PostUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutInvoicesInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type InvoiceItemsUpsertWithWhereUniqueWithoutInvoiceInput = {
    where: InvoiceItemsWhereUniqueInput
    update: XOR<InvoiceItemsUpdateWithoutInvoiceInput, InvoiceItemsUncheckedUpdateWithoutInvoiceInput>
    create: XOR<InvoiceItemsCreateWithoutInvoiceInput, InvoiceItemsUncheckedCreateWithoutInvoiceInput>
  }

  export type InvoiceItemsUpdateWithWhereUniqueWithoutInvoiceInput = {
    where: InvoiceItemsWhereUniqueInput
    data: XOR<InvoiceItemsUpdateWithoutInvoiceInput, InvoiceItemsUncheckedUpdateWithoutInvoiceInput>
  }

  export type InvoiceItemsUpdateManyWithWhereWithoutInvoiceInput = {
    where: InvoiceItemsScalarWhereInput
    data: XOR<InvoiceItemsUpdateManyMutationInput, InvoiceItemsUncheckedUpdateManyWithoutInvoiceInput>
  }

  export type UserCreateWithoutPostsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutPostsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutPostsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutPostsInput, UserUncheckedCreateWithoutPostsInput>
  }

  export type SiteCreateWithoutPostsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutPostsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutPostsInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutPostsInput, SiteUncheckedCreateWithoutPostsInput>
  }

  export type UserUpsertWithoutPostsInput = {
    update: XOR<UserUpdateWithoutPostsInput, UserUncheckedUpdateWithoutPostsInput>
    create: XOR<UserCreateWithoutPostsInput, UserUncheckedCreateWithoutPostsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutPostsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutPostsInput, UserUncheckedUpdateWithoutPostsInput>
  }

  export type UserUpdateWithoutPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SiteUpsertWithoutPostsInput = {
    update: XOR<SiteUpdateWithoutPostsInput, SiteUncheckedUpdateWithoutPostsInput>
    create: XOR<SiteCreateWithoutPostsInput, SiteUncheckedCreateWithoutPostsInput>
    where?: SiteWhereInput
  }

  export type SiteUpdateToOneWithWhereWithoutPostsInput = {
    where?: SiteWhereInput
    data: XOR<SiteUpdateWithoutPostsInput, SiteUncheckedUpdateWithoutPostsInput>
  }

  export type SiteUpdateWithoutPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutPostsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type InvoicesCreateWithoutItemsInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    User?: UserCreateNestedOneWithoutInvoicesInput
    Site?: SiteCreateNestedOneWithoutInvoicesInput
  }

  export type InvoicesUncheckedCreateWithoutItemsInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    userId?: string | null
    SiteId?: string | null
  }

  export type InvoicesCreateOrConnectWithoutItemsInput = {
    where: InvoicesWhereUniqueInput
    create: XOR<InvoicesCreateWithoutItemsInput, InvoicesUncheckedCreateWithoutItemsInput>
  }

  export type SiteCreateWithoutInvoiceItemsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    posts?: PostCreateNestedManyWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutInvoiceItemsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutInvoiceItemsInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutInvoiceItemsInput, SiteUncheckedCreateWithoutInvoiceItemsInput>
  }

  export type InvoicesUpsertWithoutItemsInput = {
    update: XOR<InvoicesUpdateWithoutItemsInput, InvoicesUncheckedUpdateWithoutItemsInput>
    create: XOR<InvoicesCreateWithoutItemsInput, InvoicesUncheckedCreateWithoutItemsInput>
    where?: InvoicesWhereInput
  }

  export type InvoicesUpdateToOneWithWhereWithoutItemsInput = {
    where?: InvoicesWhereInput
    data: XOR<InvoicesUpdateWithoutItemsInput, InvoicesUncheckedUpdateWithoutItemsInput>
  }

  export type InvoicesUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    User?: UserUpdateOneWithoutInvoicesNestedInput
    Site?: SiteUpdateOneWithoutInvoicesNestedInput
  }

  export type InvoicesUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    SiteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type SiteUpsertWithoutInvoiceItemsInput = {
    update: XOR<SiteUpdateWithoutInvoiceItemsInput, SiteUncheckedUpdateWithoutInvoiceItemsInput>
    create: XOR<SiteCreateWithoutInvoiceItemsInput, SiteUncheckedCreateWithoutInvoiceItemsInput>
    where?: SiteWhereInput
  }

  export type SiteUpdateToOneWithWhereWithoutInvoiceItemsInput = {
    where?: SiteWhereInput
    data: XOR<SiteUpdateWithoutInvoiceItemsInput, SiteUncheckedUpdateWithoutInvoiceItemsInput>
  }

  export type SiteUpdateWithoutInvoiceItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    posts?: PostUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutInvoiceItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type UserCreateWithoutAIconversationInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    posts?: PostCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAIconversationInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAIconversationInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAIconversationInput, UserUncheckedCreateWithoutAIconversationInput>
  }

  export type SiteCreateWithoutAIconversationInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    posts?: PostCreateNestedManyWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutAIconversationInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutAIconversationInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutAIconversationInput, SiteUncheckedCreateWithoutAIconversationInput>
  }

  export type UserUpsertWithoutAIconversationInput = {
    update: XOR<UserUpdateWithoutAIconversationInput, UserUncheckedUpdateWithoutAIconversationInput>
    create: XOR<UserCreateWithoutAIconversationInput, UserUncheckedCreateWithoutAIconversationInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAIconversationInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAIconversationInput, UserUncheckedUpdateWithoutAIconversationInput>
  }

  export type UserUpdateWithoutAIconversationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    posts?: PostUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAIconversationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SiteUpsertWithoutAIconversationInput = {
    update: XOR<SiteUpdateWithoutAIconversationInput, SiteUncheckedUpdateWithoutAIconversationInput>
    create: XOR<SiteCreateWithoutAIconversationInput, SiteUncheckedCreateWithoutAIconversationInput>
    where?: SiteWhereInput
  }

  export type SiteUpdateToOneWithWhereWithoutAIconversationInput = {
    where?: SiteWhereInput
    data: XOR<SiteUpdateWithoutAIconversationInput, SiteUncheckedUpdateWithoutAIconversationInput>
  }

  export type SiteUpdateWithoutAIconversationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    posts?: PostUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutAIconversationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type UserCreateWithoutDocumentsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    posts?: PostCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutDocumentsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutDocumentsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
  }

  export type SiteCreateWithoutDocumentsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    posts?: PostCreateNestedManyWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutDocumentsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutDocumentsInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutDocumentsInput, SiteUncheckedCreateWithoutDocumentsInput>
  }

  export type UserUpsertWithoutDocumentsInput = {
    update: XOR<UserUpdateWithoutDocumentsInput, UserUncheckedUpdateWithoutDocumentsInput>
    create: XOR<UserCreateWithoutDocumentsInput, UserUncheckedCreateWithoutDocumentsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutDocumentsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutDocumentsInput, UserUncheckedUpdateWithoutDocumentsInput>
  }

  export type UserUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    posts?: PostUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SiteUpsertWithoutDocumentsInput = {
    update: XOR<SiteUpdateWithoutDocumentsInput, SiteUncheckedUpdateWithoutDocumentsInput>
    create: XOR<SiteCreateWithoutDocumentsInput, SiteUncheckedCreateWithoutDocumentsInput>
    where?: SiteWhereInput
  }

  export type SiteUpdateToOneWithWhereWithoutDocumentsInput = {
    where?: SiteWhereInput
    data: XOR<SiteUpdateWithoutDocumentsInput, SiteUncheckedUpdateWithoutDocumentsInput>
  }

  export type SiteUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    posts?: PostUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutDocumentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type UserCreateWithoutSitediaryrecordsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    posts?: PostCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSitediaryrecordsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSitediaryrecordsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSitediaryrecordsInput, UserUncheckedCreateWithoutSitediaryrecordsInput>
  }

  export type SiteCreateWithoutSitediaryrecordsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    posts?: PostCreateNestedManyWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutSitediaryrecordsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
    sitediarysettings?: sitediarysettingsUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutSitediaryrecordsInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutSitediaryrecordsInput, SiteUncheckedCreateWithoutSitediaryrecordsInput>
  }

  export type UserUpsertWithoutSitediaryrecordsInput = {
    update: XOR<UserUpdateWithoutSitediaryrecordsInput, UserUncheckedUpdateWithoutSitediaryrecordsInput>
    create: XOR<UserCreateWithoutSitediaryrecordsInput, UserUncheckedCreateWithoutSitediaryrecordsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSitediaryrecordsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSitediaryrecordsInput, UserUncheckedUpdateWithoutSitediaryrecordsInput>
  }

  export type UserUpdateWithoutSitediaryrecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    posts?: PostUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSitediaryrecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SiteUpsertWithoutSitediaryrecordsInput = {
    update: XOR<SiteUpdateWithoutSitediaryrecordsInput, SiteUncheckedUpdateWithoutSitediaryrecordsInput>
    create: XOR<SiteCreateWithoutSitediaryrecordsInput, SiteUncheckedCreateWithoutSitediaryrecordsInput>
    where?: SiteWhereInput
  }

  export type SiteUpdateToOneWithWhereWithoutSitediaryrecordsInput = {
    where?: SiteWhereInput
    data: XOR<SiteUpdateWithoutSitediaryrecordsInput, SiteUncheckedUpdateWithoutSitediaryrecordsInput>
  }

  export type SiteUpdateWithoutSitediaryrecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    posts?: PostUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutSitediaryrecordsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type UserCreateWithoutSitediarysettingsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteCreateNestedManyWithoutUserInput
    posts?: PostCreateNestedManyWithoutUserInput
    Invoices?: InvoicesCreateNestedManyWithoutUserInput
    Documents?: DocumentsCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSitediarysettingsInput = {
    id: string
    email: string
    firstName: string
    lastName: string
    profileImage: string
    customerId?: string | null
    createdAt?: Date | string
    Site?: SiteUncheckedCreateNestedManyWithoutUserInput
    posts?: PostUncheckedCreateNestedManyWithoutUserInput
    Invoices?: InvoicesUncheckedCreateNestedManyWithoutUserInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutUserInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutUserInput
    Subscription?: SubscriptionUncheckedCreateNestedOneWithoutUserInput
    AIconversation?: AIconversationUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSitediarysettingsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSitediarysettingsInput, UserUncheckedCreateWithoutSitediarysettingsInput>
  }

  export type SiteCreateWithoutSitediarysettingsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    User?: UserCreateNestedOneWithoutSiteInput
    posts?: PostCreateNestedManyWithoutSiteInput
    invoices?: InvoicesCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsCreateNestedManyWithoutSiteInput
    Documents?: DocumentsCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationCreateNestedOneWithoutSiteInput
  }

  export type SiteUncheckedCreateWithoutSitediarysettingsInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
    userId?: string | null
    posts?: PostUncheckedCreateNestedManyWithoutSiteInput
    invoices?: InvoicesUncheckedCreateNestedManyWithoutSiteInput
    InvoiceItems?: InvoiceItemsUncheckedCreateNestedManyWithoutSiteInput
    Documents?: DocumentsUncheckedCreateNestedManyWithoutSiteInput
    sitediaryrecords?: sitediaryrecordsUncheckedCreateNestedManyWithoutSiteInput
    AIconversation?: AIconversationUncheckedCreateNestedOneWithoutSiteInput
  }

  export type SiteCreateOrConnectWithoutSitediarysettingsInput = {
    where: SiteWhereUniqueInput
    create: XOR<SiteCreateWithoutSitediarysettingsInput, SiteUncheckedCreateWithoutSitediarysettingsInput>
  }

  export type UserUpsertWithoutSitediarysettingsInput = {
    update: XOR<UserUpdateWithoutSitediarysettingsInput, UserUncheckedUpdateWithoutSitediarysettingsInput>
    create: XOR<UserCreateWithoutSitediarysettingsInput, UserUncheckedCreateWithoutSitediarysettingsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSitediarysettingsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSitediarysettingsInput, UserUncheckedUpdateWithoutSitediarysettingsInput>
  }

  export type UserUpdateWithoutSitediarysettingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateManyWithoutUserNestedInput
    posts?: PostUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSitediarysettingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    profileImage?: StringFieldUpdateOperationsInput | string
    customerId?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUncheckedUpdateManyWithoutUserNestedInput
    posts?: PostUncheckedUpdateManyWithoutUserNestedInput
    Invoices?: InvoicesUncheckedUpdateManyWithoutUserNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutUserNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutUserNestedInput
    Subscription?: SubscriptionUncheckedUpdateOneWithoutUserNestedInput
    AIconversation?: AIconversationUncheckedUpdateManyWithoutUserNestedInput
  }

  export type SiteUpsertWithoutSitediarysettingsInput = {
    update: XOR<SiteUpdateWithoutSitediarysettingsInput, SiteUncheckedUpdateWithoutSitediarysettingsInput>
    create: XOR<SiteCreateWithoutSitediarysettingsInput, SiteUncheckedCreateWithoutSitediarysettingsInput>
    where?: SiteWhereInput
  }

  export type SiteUpdateToOneWithWhereWithoutSitediarysettingsInput = {
    where?: SiteWhereInput
    data: XOR<SiteUpdateWithoutSitediarysettingsInput, SiteUncheckedUpdateWithoutSitediarysettingsInput>
  }

  export type SiteUpdateWithoutSitediarysettingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    User?: UserUpdateOneWithoutSiteNestedInput
    posts?: PostUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutSitediarysettingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type SiteCreateManyUserInput = {
    id?: string
    name: string
    description: string
    subdirectory: string
    createdAt?: Date | string
    updatedAt?: Date | string
    imageUrl?: string | null
  }

  export type PostCreateManyUserInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    siteId?: string | null
  }

  export type InvoicesCreateManyUserInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    SiteId?: string | null
  }

  export type DocumentsCreateManyUserInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    siteId?: string | null
  }

  export type sitediaryrecordsCreateManyUserInput = {
    id?: string
    siteId?: string | null
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
  }

  export type AIconversationCreateManyUserInput = {
    id?: string
    thread?: NullableJsonNullValueInput | InputJsonValue
    siteId: string
  }

  export type sitediarysettingsCreateManyUserInput = {
    id?: string
    fileUrl?: string | null
    siteId?: string | null
    schema?: string | null
  }

  export type SiteUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    posts?: PostUncheckedUpdateManyWithoutSiteNestedInput
    invoices?: InvoicesUncheckedUpdateManyWithoutSiteNestedInput
    InvoiceItems?: InvoiceItemsUncheckedUpdateManyWithoutSiteNestedInput
    Documents?: DocumentsUncheckedUpdateManyWithoutSiteNestedInput
    sitediaryrecords?: sitediaryrecordsUncheckedUpdateManyWithoutSiteNestedInput
    AIconversation?: AIconversationUncheckedUpdateOneWithoutSiteNestedInput
    sitediarysettings?: sitediarysettingsUncheckedUpdateOneWithoutSiteNestedInput
  }

  export type SiteUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    subdirectory?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PostUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateOneWithoutPostsNestedInput
  }

  export type PostUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PostUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoicesUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Site?: SiteUpdateOneWithoutInvoicesNestedInput
    items?: InvoiceItemsUpdateManyWithoutInvoiceNestedInput
  }

  export type InvoicesUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    SiteId?: NullableStringFieldUpdateOperationsInput | string | null
    items?: InvoiceItemsUncheckedUpdateManyWithoutInvoiceNestedInput
  }

  export type InvoicesUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    SiteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DocumentsUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    Site?: SiteUpdateOneWithoutDocumentsNestedInput
  }

  export type DocumentsUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DocumentsUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type sitediaryrecordsUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
    Site?: SiteUpdateOneWithoutSitediaryrecordsNestedInput
  }

  export type sitediaryrecordsUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
  }

  export type sitediaryrecordsUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
  }

  export type AIconversationUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    site?: SiteUpdateOneWithoutAIconversationNestedInput
  }

  export type AIconversationUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    siteId?: StringFieldUpdateOperationsInput | string
  }

  export type AIconversationUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    thread?: NullableJsonNullValueInput | InputJsonValue
    siteId?: StringFieldUpdateOperationsInput | string
  }

  export type sitediarysettingsUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
    Site?: SiteUpdateOneWithoutSitediarysettingsNestedInput
  }

  export type sitediarysettingsUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type sitediarysettingsUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileUrl?: NullableStringFieldUpdateOperationsInput | string | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    schema?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PostCreateManySiteInput = {
    id?: string
    title: string
    articleContent: JsonNullValueInput | InputJsonValue
    smallDescription: string
    image: string
    slug: string
    createdAt?: Date | string
    updatedAt?: Date | string
    userId?: string | null
  }

  export type InvoicesCreateManySiteInput = {
    id?: string
    url: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceTotalSumNoVat?: number | null
    invoiceTotalSumWithVat?: number | null
    buyerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
    isInvoice?: boolean | null
    isCreditDebitProformaOrAdvanced?: string | null
    uploadedAt?: Date | string
    userId?: string | null
  }

  export type InvoiceItemsCreateManySiteInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    invoiceId: string
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
  }

  export type DocumentsCreateManySiteInput = {
    id?: string
    url: string
    documentType: string
    documentName: string
    description: string
    userId?: string | null
  }

  export type sitediaryrecordsCreateManySiteInput = {
    id?: string
    userId?: string | null
    Date?: Date | string | null
    Location?: string | null
    Works?: string | null
    Comments?: string | null
    Units?: string | null
    Amounts?: number | null
    WorkersInvolved?: number | null
    TimeInvolved?: number | null
    Photos?: sitediaryrecordsCreatePhotosInput | string[]
  }

  export type PostUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    User?: UserUpdateOneWithoutPostsNestedInput
  }

  export type PostUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PostUncheckedUpdateManyWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    articleContent?: JsonNullValueInput | InputJsonValue
    smallDescription?: StringFieldUpdateOperationsInput | string
    image?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoicesUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    User?: UserUpdateOneWithoutInvoicesNestedInput
    items?: InvoiceItemsUpdateManyWithoutInvoiceNestedInput
  }

  export type InvoicesUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    items?: InvoiceItemsUncheckedUpdateManyWithoutInvoiceNestedInput
  }

  export type InvoicesUncheckedUpdateManyWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceTotalSumNoVat?: NullableFloatFieldUpdateOperationsInput | number | null
    invoiceTotalSumWithVat?: NullableFloatFieldUpdateOperationsInput | number | null
    buyerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    isCreditDebitProformaOrAdvanced?: NullableStringFieldUpdateOperationsInput | string | null
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoiceItemsUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    invoice?: InvoicesUpdateOneRequiredWithoutItemsNestedInput
  }

  export type InvoiceItemsUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceId?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoiceItemsUncheckedUpdateManyWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceId?: StringFieldUpdateOperationsInput | string
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DocumentsUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    User?: UserUpdateOneWithoutDocumentsNestedInput
  }

  export type DocumentsUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type DocumentsUncheckedUpdateManyWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    documentType?: StringFieldUpdateOperationsInput | string
    documentName?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type sitediaryrecordsUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
    User?: UserUpdateOneWithoutSitediaryrecordsNestedInput
  }

  export type sitediaryrecordsUncheckedUpdateWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
  }

  export type sitediaryrecordsUncheckedUpdateManyWithoutSiteInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    Date?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    Location?: NullableStringFieldUpdateOperationsInput | string | null
    Works?: NullableStringFieldUpdateOperationsInput | string | null
    Comments?: NullableStringFieldUpdateOperationsInput | string | null
    Units?: NullableStringFieldUpdateOperationsInput | string | null
    Amounts?: NullableFloatFieldUpdateOperationsInput | number | null
    WorkersInvolved?: NullableIntFieldUpdateOperationsInput | number | null
    TimeInvolved?: NullableFloatFieldUpdateOperationsInput | number | null
    Photos?: sitediaryrecordsUpdatePhotosInput | string[]
  }

  export type InvoiceItemsCreateManyInvoiceInput = {
    id?: string
    item?: string | null
    quantity?: number | null
    unitOfMeasure?: string | null
    pricePerUnitOfMeasure?: number | null
    sum?: number | null
    currency?: string | null
    category?: string | null
    itemDescription?: string | null
    commentsForUser?: string | null
    isInvoice?: boolean | null
    siteId?: string | null
    invoiceNumber?: string | null
    sellerName?: string | null
    invoiceDate?: string | null
    paymentDate?: string | null
  }

  export type InvoiceItemsUpdateWithoutInvoiceInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
    Site?: SiteUpdateOneWithoutInvoiceItemsNestedInput
  }

  export type InvoiceItemsUncheckedUpdateWithoutInvoiceInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type InvoiceItemsUncheckedUpdateManyWithoutInvoiceInput = {
    id?: StringFieldUpdateOperationsInput | string
    item?: NullableStringFieldUpdateOperationsInput | string | null
    quantity?: NullableFloatFieldUpdateOperationsInput | number | null
    unitOfMeasure?: NullableStringFieldUpdateOperationsInput | string | null
    pricePerUnitOfMeasure?: NullableFloatFieldUpdateOperationsInput | number | null
    sum?: NullableFloatFieldUpdateOperationsInput | number | null
    currency?: NullableStringFieldUpdateOperationsInput | string | null
    category?: NullableStringFieldUpdateOperationsInput | string | null
    itemDescription?: NullableStringFieldUpdateOperationsInput | string | null
    commentsForUser?: NullableStringFieldUpdateOperationsInput | string | null
    isInvoice?: NullableBoolFieldUpdateOperationsInput | boolean | null
    siteId?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceNumber?: NullableStringFieldUpdateOperationsInput | string | null
    sellerName?: NullableStringFieldUpdateOperationsInput | string | null
    invoiceDate?: NullableStringFieldUpdateOperationsInput | string | null
    paymentDate?: NullableStringFieldUpdateOperationsInput | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}