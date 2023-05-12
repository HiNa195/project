const express = require("express");
const path = require("path");
const dblib = require("./dblib");
const multer = require("multer");
const upload = multer();

// Creating the Express server
const app = express();

// Server configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
// or use: app.use(express.static("public/css"));

// Add middleware to parse default urlencoded form
app.use(express.urlencoded({ extended: false }));

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 2
});

// GET /
app.get("/", (req, res) => {
  res.render("index");
});

// GET /manage
app.get("/manage", async (req, res) => {
  try {
    const totalRecords = await dblib.getTotalRecords();
    const projCus = {
      cusid: "",
      cusfname: "",
      cuslname: "",
      cusstate: "",
      cussalesytd: "",
      cussalesprev: ""
    };
    res.render("manage", {
      type: "get",
      totalRecords: totalRecords.totRecords,
      projCus: projCus
    });
  } catch (err) {
    res.status(500).send(`Unexpected Error: ${err.message}`);
  }
});

// POST /manage
app.post("/manage", async (req, res) => {
  const totalRecords = await dblib.getTotalRecords();
  dblib.searchCustomers(req.body)
      .then(result => {
          res.render("manage", {
              type: "post",
              totalRecords: totalRecords.totRecords,
              result: result,
              projCus: req.body
          })
      })
      .catch(err => {
          res.render("manage", {
              type: "post",
              totalRecords: totalRecords.totRecords,
              result: `Unexpected Error: ${err.message}`,
              projCus: req.body
          });
      });
});

// GET /create
app.get("/create", (req, res) => {
  res.render("create", { projCus: {} });
});

// POST /create
app.post("/create", (req, res) => {
  const cus = [
    req.body.cusid,
    req.body.cusfname,
    req.body.cuslname,
    req.body.cusstate,
    req.body.cussalesytd,
    req.body.cussalesprev
  ];

  const sql = "INSERT INTO customer (cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)";

  pool.query(sql, cus, (err, result) => {
    if (err) {
      console.error(err);
      return res.render("create", { projCus: req.body, error: "Error Creating New Customer", err });
    } else {
      const successMessage = "New Customer Created!";
      return res.render("create", { projCus: req.body, success: successMessage });
    }
  });
});

// GET /edit/:cusid
app.get("/edit/:cusid", (req, res) => {
  const id = req.params.cusid;
  const sql = "SELECT * FROM customer WHERE cusid = $1";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.render("index", { error: "Error Fetching Customer Record." });
    } else {
      const cus = result.rows[0];
      return res.render("edit", { projCus: cus });
    }
  });
});

// POST /edit/:cusid
app.post("/edit/:cusid", (req, res) => {
  const cusid = req.params.cusid;
  const cus = [
    req.body.cusfname,
    req.body.cuslname,
    req.body.cusstate,
    req.body.cussalesytd,
    req.body.cussalesprev,
    cusid];
  
  const sql = "UPDATE customer SET cusfname = $1, cuslname = $2, cusstate = $3, cussalesytd = $4, cussalesprev = $5 WHERE (cusid = $6)";
  
  pool.query(sql, cus, (err, result) => {
    if (err) {
      console.error(err);
      return res.render("edit", { projCus: req.body, error: "Error Updating Customer Record." });
    } else {
      const successMessage = "Customer Updated Successfully!";
      return res.render("edit", { projCus: req.body, success: successMessage });
    }
  });
});

// GET /delete/cusid
app.get("/delete/:cusid", (req, res) => {
  const id = req.params.cusid;
  const sql = "SELECT * FROM customer WHERE cusid = $1";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.render("index", { error: "Error Fetching Customer Record." });
    } else {
      const cus = result.rows[0];
      return res.render("delete", { projCus: cus });
    }
  });
});
  
// POST /delete/:cusid
app.post("/delete/:cusid", (req, res) => {
  const id = req.params.cusid;
  const sql = "DELETE FROM customer WHERE (cusid = $1)";
  pool.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.render("delete", { projCus: req.body, error: "Error Deleting Customer Record." });
    } else {
      const successMessage = "Customer Deleted Successfully!";
      return res.render("delete", { projCus: req.body, success: successMessage });
    }
  });
});

// GET /import
app.get("/import", async (req, res) => {
  try {
    const totalRecords = await dblib.getTotalRecords();
    const projCus = {
      cusid: "",
      cusfname: "",
      cuslname: "",
      cusstate: "",
      cussalesytd: "",
      cussalesprev: ""
    };
    res.render("import", {
      type: "get",
      totalRecords: totalRecords.totRecords,
      projCus: projCus
    });
  } catch (err) {
    res.status(500).send(`Unexpected Error: ${err.message}`);
  }
});

// POST /import
app.post("/import", upload.single('filename'), (req, res) => {
  if (!req.file || Object.keys(req.file).length === 0) {
    const message = "Error: Import file not uploaded";
    return res.send({ message });
  };

  // Read file line by line, inserting records
const buffer = req.file.buffer;
const lines = buffer.toString().split(/\r?\n/);

const promises = lines.map(line => {
  const customer = line.split(",");
  const sql = "INSERT INTO customer(cusid, cusfname, cuslname, cusstate, cussalesytd, cussalesprev) VALUES ($1, $2, $3, $4, $5, $6)";
  return pool.query(sql, customer)
    .then(result => {
      console.log(`Inserted successfully`);
      return { success: true };
    })
    .catch(error => {
      console.log(`Insert Error. Error message: ${error.message}`);
      const err = `Customer ID: ${customer[0]} - Error: ${error.message}`;
      return { success: false, error: err };
    });
});

Promise.all(promises)
  .then(results => {
    const recordsImported = results.filter(r => r.success).length;
    const recordsNotInserted = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error);
    const message = `Import Summary
      - Records Processed: ${lines.length}
      - Records Imported Successfully: ${recordsImported}
      - Records Not Inserted: ${recordsNotInserted}`;

    const response = {
      message,
      errors
    };
    res.send(response);
  })
  .catch(error => {
    const message = `Error: ${error.message}`;
    res.send({ message });
  });
});

// GET /export
app.get("/export", async (req, res) => {
  try {
    const totalRecords = await dblib.getTotalRecords();
    const projCus = {
      cusid: "",
      cusfname: "",
      cuslname: "",
      cusstate: "",
      cussalesytd: "",
      cussalesprev: ""
    };
    res.render("export", {
      message: "",
      type: "get",
      totalRecords: totalRecords.totRecords,
      projCus: projCus
    });
  } catch (err) {
    res.status(500).send(`Unexpected Error: ${err.message}`);
  }
});

// POST /export
app.post("/export", (req, res) => {
  const sql = "SELECT * FROM customer ORDER BY cusid";
  pool.query(sql, [], (err, result) => {
      var message = "";
      if (err) {
          message = `Error - ${err.message}`;
          res.render("export", { message: message })
      } else {
          var output = "";
          result.rows.forEach(customer => {
              output += `${customer.cusid},${customer.cusfname},${customer.cuslname},${customer.cusstate},${customer.cussalesytd},${customer.cussalesprev}\r\n`;
          });
          res.header("Content-Type", "text/plain");
          res.attachment("export.txt");
          return res.send(output);
      };
  });
});

// Starting the server
app.listen(process.env.PORT || 3000, () => {
  console.log("Server started (http://localhost:3000/) !");
});