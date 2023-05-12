const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 2
});

const getTotalRecords = () => {
    sql = "SELECT COUNT(*) FROM customer";
    return pool.query(sql)
        .then(result => {
            return {
                msg: "success",
                totRecords: result.rows[0].count
            }
        })
        .catch(err => {
            return {
                msg: `Error: ${err.message}`
            }
        });
};

const searchCustomers = (cus) => {
  var i = 1;
  let sql = "SELECT * FROM customer WHERE true";
  let values = [];

  if (cus.cusid !== "") {
    values.push(cus.cusid);
    sql += ` AND cusid = $${i}`;
    i++;
  }

  if (cus.cusfname !== "") {
    values.push(`${cus.cusfname}%`);
    sql += ` AND LOWER(cusfname) LIKE LOWER($${i})`;
    i++;
  }

  if (cus.cuslname !== "") {
    values.push(`${cus.cuslname}%`);
    sql += ` AND LOWER(cuslname) LIKE LOWER($${i})`;
    i++;
  }

  if (cus.cusstate !== "") {
    values.push(cus.cusstate);
    sql += ` AND LOWER(cusstate) = LOWER($${i})`;
    i++;
  }

  if (cus.cussalesytd !== "") {
    values.push(parseFloat(cus.cussalesytd));
    sql += ` AND cussalesytd >= $${i}`;
    i++;
  }

  if (cus.cussalesprev !== "") {
    values.push(parseFloat(cus.cussalesprev));
    sql += ` AND cussalesprev >= $${i}`;
    i++;
  }

  sql += ` ORDER BY cusid`;

  return pool.query(sql, values)
        .then(result => {
            return { 
                trans: "success",
                rows: result.rows
            }
        })
        .catch(err => {
            return {
                trans: "Error",
                error: `Error: ${err.message}`
            }
        });
}

function insertCustomer(cus, callback) {
    const sql = "INSERT INTO customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)";
    pool.query(sql, cus, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    });
  }

module.exports = {
  getTotalRecords,
  searchCustomers,
  insertCustomer
};