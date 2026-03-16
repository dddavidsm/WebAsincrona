import { knex } from "knex";

class Database {
  db!: knex.Knex

  query(table?: string) {
    return table ? this.db.from(table) : this.db
  }

  async start() {
    let db = knex({
      client: "pg",
      connection: {
        host: "127.0.0.1",
        port: 5432,
        user: "postgres",
        password: "alubbdd",
        database: "northwind"
      }
    })
    this.db = db
  }
}

let db = new Database()
export default db