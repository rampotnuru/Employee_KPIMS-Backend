// Import required modules
const express = require("express");
const mysql = require("mysql2");
const Adminvalidations = require("./Validations/AdminValidations.js");

// Create an Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Create MySQL database connection
const DatabaseConnection = mysql.createConnection({
  host: "database-1.cgln2kvgxra4.us-west-2.rds.amazonaws.com",
  user: "admin",
  password: "Admin#123",
  database: "kpi_application",
});

// Connect to the database
DatabaseConnection.connect((err, res) => {
  if (err) {
    console.log(err);
  } else {
    console.log("kpi_Application Database successfully connected");
  }
});

app.use(express.json());
var parser = require("body-parser");
app.use(parser.json());
const cors = require("cors");
app.use(cors());
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const secretKey = "chinna";

// AdminPost function
const AdminPost = (req, res) => {
  const validation = Adminvalidations.validate(req.body);
  if (validation.error) {
    res.status(400).json({ error: validation.error.details[0].message });
  } else {
    const query =
      "INSERT INTO adminregister_data(adminID, adminName, adminEmail, adminPassword) VALUES ('" +
      req.body.adminID +
      "','" +
      req.body.adminName +
      "','" +
      req.body.adminEmail +
      "','" +
      req.body.adminPassword +
      "')";
    DatabaseConnection.query(query, (err, resp) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.json({ message: "Admin successfully registered." });
      }
    });
  }
};
const AdminloginPost = (req, res) => {
  const query =
    "SELECT * FROM adminregister_data WHERE adminEmail = '" +
    req.body.adminEmail +
    "' AND adminPassword = '" +
    req.body.adminPassword +
    "'";
  DatabaseConnection.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "An error occurred while logging in" });
    } else {
      if (results.length > 0) {
        const user = results[0];
        const payload = {
          adminID: user.adminID,
          adminName: user.adminName,
          adminEmail: user.adminEmail,
          adminPassword: user.adminPassword,
        };
        jwt.sign(payload, secretKey, { expiresIn: "1hr" }, (err, token) => {
          if (err) {
            res
              .status(500)
              .json({ error: "An error occurred while generating token" });
          } else {
            res.status(200).json({ message: "Admin Login successful", token });
          }
        });
      } else {
        res.status(401).json({ message: "Admin not found" });
      }
    }
  });
};
const Admin_Employee_Insert_Data = (req, res) => {
  try {
    const data = req.body;
    if (Array.isArray(data) && data.length > 0) {
      for (const entry of data) {
        const adminID = entry.adminID;
        const entryData = entry.data;
        if (Array.isArray(entryData) && entryData.length > 0) {
          for (const categoryData of entryData) {
            for (const entry in data) {
              const adminID = data[entry].adminID;

              for (const categoryData of data[entry].data) {
                for (const categoryName in categoryData) {
                  const subcategories = categoryData[categoryName];

                  for (const subcategory of subcategories) {
                    const subcategoryName = subcategory.Name;

                    if (subcategory.Questions && subcategory.QuantityTarget) {
                      for (let i = 0; i < subcategory.Questions.length; i++) {
                        const question = subcategory.Questions[i];
                        const quantityTarget = subcategory.QuantityTarget[i];
                        const checkQuery = `SELECT * FROM admin_data_employee_table WHERE adminID = ? AND Category = ? AND Name = ? AND Questions = ?`;
                        DatabaseConnection.query(
                          checkQuery,
                          [adminID, categoryName, subcategoryName, question],
                          (err, results) => {
                            if (err) {
                              console.error(err);
                            } else {
                              if (results.length > 0) {
                                const updateQuery = `UPDATE admin_data_employee_table SET QuantityTarget = ? WHERE adminID = ? AND Category = ? AND Name = ? AND Questions = ?`;
                                DatabaseConnection.query(
                                  updateQuery,
                                  [
                                    quantityTarget,
                                    adminID,
                                    categoryName,
                                    subcategoryName,
                                    question,
                                  ],
                                  (err, results) => {
                                    if (err) {
                                      console.error(err);
                                    }
                                  }
                                );
                              } else {
                                const insertQuery = `INSERT INTO admin_data_employee_table (adminID, Category, Name, Questions, QuantityTarget) VALUES (?, ?, ?, ?, ?)`;
                                DatabaseConnection.query(
                                  insertQuery,
                                  [
                                    adminID,
                                    categoryName,
                                    subcategoryName,
                                    question,
                                    quantityTarget,
                                  ],
                                  (err, results) => {
                                    if (err) {
                                      console.error(err);
                                    }
                                  }
                                );
                              }
                            }
                          }
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return res
      .status(201)
      .json({ message: "admin employee metric insert successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
const Admin_Employee_Retrive_Data = (req, res) => {
  try {
    const responseData = {};

    const query = "SELECT * FROM admin_data_employee_table";
    DatabaseConnection.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "An error occurred" });
      }

      results.forEach((row) => {
        const { Category, Name, Questions, QuantityTarget } = row;

        if (!responseData[Category]) {
          responseData[Category] = [];
        }

        const existingCategory = responseData[Category].find(
          (item) => item.Name === Name
        );

        if (!existingCategory) {
          responseData[Category].push({
            Name,
            Questions: Questions ? Questions.split("\n") : [],
            QuantityTarget: QuantityTarget ? [QuantityTarget] : [],
          });
        } else {
          existingCategory.Questions = [
            ...existingCategory.Questions,
            ...(Questions ? Questions.split("\n") : []),
          ];
          existingCategory.QuantityTarget = [
            ...existingCategory.QuantityTarget,
            QuantityTarget,
          ];
        }
      });

      return res.status(200).json(responseData);
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
const Admin_Employee_Delete_Data = (req, res) => {
  const { adminID, category, name, questions } = req.params;

  if (!adminID) {
    return res.status(400).json({ error: "Invalid adminID provided" });
  }

  let deleteQuery = `
          DELETE FROM admin_data_employee_table 
          WHERE adminID = ?`;
  const queryParams = [adminID];

  if (category) {
    deleteQuery += " AND Category = ?";
    queryParams.push(category);
  }

  if (name) {
    deleteQuery += " AND Name = ?";
    queryParams.push(name);
  }

  if (questions) {
    deleteQuery += " AND questions = ?";
    queryParams.push(questions);
  }

  DatabaseConnection.query(deleteQuery, queryParams, (err, result) => {
    if (err) {
      console.error("Error deleting data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting data." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Data not found for the provided parameters." });
    }

    return res.json({
      success: true,
      message: "admin employee metric deleted successfully",
    });
  });
};
const Admin_Manager_Insert_Data = (req, res) => {
  try {
    const data = req.body;
    if (Array.isArray(data) && data.length > 0) {
      for (const entry of data) {
        const adminID = entry.adminID;
        const entryData = entry.data;

        if (Array.isArray(entryData) && entryData.length > 0) {
          for (const categoryData of entryData) {
            for (const entry in data) {
              const adminID = data[entry].adminID;

              for (const categoryData of data[entry].data) {
                for (const categoryName in categoryData) {
                  const subcategories = categoryData[categoryName];

                  for (const subcategory of subcategories) {
                    const subcategoryName = subcategory.Name;

                    if (subcategory.Questions && subcategory.QuantityTarget) {
                      for (let i = 0; i < subcategory.Questions.length; i++) {
                        const question = subcategory.Questions[i];
                        const quantityTarget = subcategory.QuantityTarget[i];
                        const checkQuery = `SELECT * FROM admin_data_manager_table WHERE adminID = ? AND Category = ? AND Name = ? AND Questions = ?`;
                        DatabaseConnection.query(
                          checkQuery,
                          [adminID, categoryName, subcategoryName, question],
                          (err, results) => {
                            if (err) {
                              console.error(err);
                            } else {
                              if (results.length > 0) {
                                const updateQuery = `UPDATE admin_data_manager_table SET QuantityTarget = ? WHERE adminID = ? AND Category = ? AND Name = ? AND Questions = ?`;
                                DatabaseConnection.query(
                                  updateQuery,
                                  [
                                    quantityTarget,
                                    adminID,
                                    categoryName,
                                    subcategoryName,
                                    question,
                                  ],
                                  (err, results) => {
                                    if (err) {
                                      console.error(err);
                                    }
                                  }
                                );
                              } else {
                                const insertQuery = `INSERT INTO admin_data_manager_table (adminID, Category, Name, Questions, QuantityTarget) VALUES (?, ?, ?, ?, ?)`;
                                DatabaseConnection.query(
                                  insertQuery,
                                  [
                                    adminID,
                                    categoryName,
                                    subcategoryName,
                                    question,
                                    quantityTarget,
                                  ],
                                  (err, results) => {
                                    if (err) {
                                      console.error(err);
                                    }
                                  }
                                );
                              }
                            }
                          }
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return res
      .status(201)
      .json({ message: "admin manager metric insert successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
const Admin_Manager_Retrive_Data = (req, res) => {
  try {
    const responseData = {};

    const query = "SELECT * FROM admin_data_manager_table";
    DatabaseConnection.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "An error occurred" });
      }

      results.forEach((row) => {
        const { Category, Name, Questions, QuantityTarget } = row;

        if (!responseData[Category]) {
          responseData[Category] = [];
        }

        const existingCategory = responseData[Category].find(
          (item) => item.Name === Name
        );

        if (!existingCategory) {
          responseData[Category].push({
            Name,
            Questions: Questions ? Questions.split("\n") : [],
            QuantityTarget: QuantityTarget
              ? QuantityTarget.split(",").map(Number)
              : [],
          });
        } else {
          existingCategory.Questions = [
            ...existingCategory.Questions,
            ...(Questions ? Questions.split("\n") : []),
          ];
          existingCategory.QuantityTarget = [
            ...existingCategory.QuantityTarget,
            ...(QuantityTarget ? QuantityTarget.split(",").map(Number) : []),
          ];
        }
      });

      return res.status(200).json(responseData);
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
const Admin_Manager_Data_Delete = (req, res) => {
  const { adminID, category, name, questions } = req.params;

  if (!adminID) {
    return res.status(400).json({ error: "Invalid adminID provided" });
  }

  let deleteQuery = `
          DELETE FROM admin_data_manager_table 
          WHERE adminID = ?`;
  const queryParams = [adminID];

  if (category) {
    deleteQuery += " AND Category = ?";
    queryParams.push(category);
  }

  if (name) {
    deleteQuery += " AND Name = ?";
    queryParams.push(name);
  }

  if (questions) {
    deleteQuery += " AND questions = ?";
    queryParams.push(questions);
  }

  DatabaseConnection.query(deleteQuery, queryParams, (err, result) => {
    if (err) {
      console.error("Error deleting data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting data." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Data not found for the provided parameters." });
    }

    return res.json({
      success: true,
      message: "admin manager metric deleted successfully",
    });
  });
};
const Admin_Director_Insert_Data = (req, res) => {
  try {
    const data = req.body;
    if (Array.isArray(data) && data.length > 0) {
      for (const entry of data) {
        const adminID = entry.adminID;
        const entryData = entry.data;

        if (Array.isArray(entryData) && entryData.length > 0) {
          for (const categoryData of entryData) {
            for (const entry in data) {
              const adminID = data[entry].adminID;

              for (const categoryData of data[entry].data) {
                for (const categoryName in categoryData) {
                  const subcategories = categoryData[categoryName];

                  for (const subcategory of subcategories) {
                    const subcategoryName = subcategory.Name;

                    if (subcategory.Questions && subcategory.QuantityTarget) {
                      for (let i = 0; i < subcategory.Questions.length; i++) {
                        const question = subcategory.Questions[i];
                        const quantityTarget = subcategory.QuantityTarget[i];
                        const checkQuery = `SELECT * FROM admin_data_director_table WHERE adminID = ? AND Category = ? AND Name = ? AND Questions = ?`;
                        DatabaseConnection.query(
                          checkQuery,
                          [adminID, categoryName, subcategoryName, question],
                          (err, results) => {
                            if (err) {
                              console.error(err);
                            } else {
                              if (results.length > 0) {
                                const updateQuery = `UPDATE admin_data_director_table SET QuantityTarget = ? WHERE adminID = ? AND Category = ? AND Name = ? AND Questions = ?`;
                                DatabaseConnection.query(
                                  updateQuery,
                                  [
                                    quantityTarget,
                                    adminID,
                                    categoryName,
                                    subcategoryName,
                                    question,
                                  ],
                                  (err, results) => {
                                    if (err) {
                                      console.error(err);
                                    }
                                  }
                                );
                              } else {
                                const insertQuery = `INSERT INTO admin_data_director_table (adminID, Category, Name, Questions, QuantityTarget) VALUES (?, ?, ?, ?, ?)`;
                                DatabaseConnection.query(
                                  insertQuery,
                                  [
                                    adminID,
                                    categoryName,
                                    subcategoryName,
                                    question,
                                    quantityTarget,
                                  ],
                                  (err, results) => {
                                    if (err) {
                                      console.error(err);
                                    }
                                  }
                                );
                              }
                            }
                          }
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return res
      .status(201)
      .json({ message: "admin director metric insert successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
const Admin_Director_Retrive_Data = (req, res) => {
  try {
    const responseData = {};

    const query = "SELECT * FROM admin_data_director_table";
    DatabaseConnection.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "An error occurred" });
      }

      results.forEach((row) => {
        const { Category, Name, Questions, QuantityTarget } = row;

        if (!responseData[Category]) {
          responseData[Category] = [];
        }

        const existingCategory = responseData[Category].find(
          (item) => item.Name === Name
        );

        if (!existingCategory) {
          responseData[Category].push({
            Name,
            Questions: Questions ? Questions.split("\n") : [],
            QuantityTarget: QuantityTarget
              ? QuantityTarget.split(",").map(Number)
              : [],
          });
        } else {
          existingCategory.Questions = [
            ...existingCategory.Questions,
            ...(Questions ? Questions.split("\n") : []),
          ];
          existingCategory.QuantityTarget = [
            ...existingCategory.QuantityTarget,
            ...(QuantityTarget ? QuantityTarget.split(",").map(Number) : []),
          ];
        }
      });

      return res.status(200).json(responseData);
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
const Admin_Director_Data_Delete = (req, res) => {
  const { adminID, category, name, questions } = req.params;

  if (!adminID) {
    return res.status(400).json({ error: "Invalid adminID provided" });
  }

  let deleteQuery = `
        DELETE FROM admin_data_director_table 
        WHERE adminID = ?`;
  const queryParams = [adminID];

  if (category) {
    deleteQuery += " AND Category = ?";
    queryParams.push(category);
  }

  if (name) {
    deleteQuery += " AND Name = ?";
    queryParams.push(name);
  }

  if (questions) {
    deleteQuery += " AND questions = ?";
    queryParams.push(questions);
  }

  DatabaseConnection.query(deleteQuery, queryParams, (err, result) => {
    if (err) {
      console.error("Error deleting data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting data." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Data not found for the provided parameters." });
    }

    return res.json({
      success: true,
      message: "admin director metric deleted successfully",
    });
  });
};
//Save-Data
const Save_Employee_Insert_Data = (req, res) => {
  const data = req.body;
  if (
    !data ||
    !data[0] ||
    !data[0].Empid ||
    !data[0].Empname ||
    !data[0].data ||
    !Array.isArray(data[0].data)
  ) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const values = [];

  for (const entry of data[0].data) {
    const { Value, valuecreater } = entry;
    for (const category of valuecreater) {
      const { name, questions } = category;
      for (const question of questions) {
        const { Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments } =
          question;

        values.push([
          data[0].Empid,
          data[0].Empname,
          Value,
          name,
          Metric,
          QuantityTarget,
          QuantityAchieved,
          IndexKpi,
          Comments,
        ]);
      }
    }
  }
  const insertQuery = `INSERT INTO save_all_datastored_employee_table (Empid, Empname, Value, Name, Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments) VALUES ?`;
  DatabaseConnection.query(insertQuery, [values], (err, result) => {
    if (err) {
      console.error("Error storing data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while storing data." });
    }
    return res.json({
      success: true,
      message: "Save_Employee_Data stored successfully",
    });
  });
};
const Save_Employee_Retrive_Data = (req, res) => {
  const { Empid, Value, Name } = req.params;
  let query = `
        SELECT * FROM save_all_datastored_employee_table`;

  if (Empid) {
    query += ` WHERE save_all_datastored_employee_table.Empid = ?`;

    if (Value) {
      query += ` AND save_all_datastored_employee_table.Value = ?`;

      if (Name) {
        query += ` AND save_all_datastored_employee_table.Name = ?;`;
      } else {
        query += `;`;
      }
    } else {
      query += `;`;
    }

    const queryParams = [Empid];

    if (Value) {
      queryParams.push(Value);
    }

    if (Name) {
      queryParams.push(Name);
    }

    DatabaseConnection.query(query, queryParams, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching data" });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: `Employee with Empid ${Empid} not found` });
      }

      const employeeData = {
        Empid: result[0].Empid,
        Empname: result[0].Empname,
        ratings: result.map((row) => ({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        })),
      };

      res.status(200).json({ employee: employeeData });
    });
  } else {
    DatabaseConnection.query(query, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching data" });
      }

      const employeesData = {};
      result.forEach((row) => {
        if (!employeesData[row.Empid]) {
          employeesData[row.Empid] = {
            Empid: row.Empid,
            Empname: row.Empname,
            ratings: [],
          };
        }
        employeesData[row.Empid].ratings.push({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        });
      });

      const employees = Object.values(employeesData);
      res.status(200).json({ employees });
    });
  }
};
const Save_Employee_Data_Update = (req, res) => {
  const { Data } = req.body;
  const { Empid } = req.params;
  if (!Data || !Array.isArray(Data)) {
    return res.status(400).json({ error: "Invalid request data" });
  }
  const updateQuery = `
            UPDATE save_all_datastored_employee_table
            SET QuantityTarget = ?,
                QuantityAchieved = ?,
                IndexKpi = ?,
                Comments = ?
            WHERE 
                Empid = ? AND
                Value = ? AND
                Name = ? AND
                Metric = ?`;

  const promises = [];
  Data.forEach((item) => {
    const {
      Value,
      Name,
      Metric,
      QuantityTarget,
      QuantityAchieved,
      IndexKpi,
      Comments,
    } = item;
    promises.push(
      new Promise((resolve, reject) => {
        DatabaseConnection.query(
          updateQuery,
          [
            QuantityTarget,
            QuantityAchieved,
            IndexKpi,
            Comments,
            Empid,
            Value,
            Name,
            Metric,
          ],
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      })
    );
  });
  Promise.all(promises)
    .then(() => {
      return res.json({
        success: true,
        message: "save_Employee_Data updated successfully",
      });
    })
    .catch((err) => {
      console.error("Error updating data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while updating data." });
    });
};
const Save_Employee_Data_Delete = (req, res) => {
  const { Empid } = req.params;

  if (!Empid) {
    return res.status(400).json({ error: "Invalid Empid provided" });
  }

  const deleteQuery = `
          DELETE FROM save_all_datastored_employee_table WHERE Empid = ?;
        `;

  DatabaseConnection.query(deleteQuery, [Empid], (err, result) => {
    if (err) {
      console.error("Error deleting employee data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting employee data." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Employee data not found for the provided Empid." });
    }

    return res.json({
      success: true,
      message: "Saved Employee data deleted successfully",
    });
  });
};
const Save_Manager_Insert_Data = (req, res) => {
  const data = req.body;
  if (
    !data ||
    !data[0] ||
    !data[0].Empid ||
    !data[0].Empname ||
    !data[0].data ||
    !Array.isArray(data[0].data)
  ) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const values = [];

  for (const entry of data[0].data) {
    const { Value, valuecreater } = entry;
    for (const category of valuecreater) {
      const { name, questions } = category;
      for (const question of questions) {
        const { Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments } =
          question;

        values.push([
          data[0].Empid,
          data[0].Empname,
          Value,
          name,
          Metric,
          QuantityTarget,
          QuantityAchieved,
          IndexKpi,
          Comments,
        ]);
      }
    }
  }
  const insertQuery = `INSERT INTO save_all_datastored_manager_table (Empid, Empname, Value, Name, Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments) VALUES ?`;
  DatabaseConnection.query(insertQuery, [values], (err, result) => {
    if (err) {
      console.error("Error storing data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while storing data." });
    }
    return res.json({
      success: true,
      message: "Save_Manager_Data stored successfully",
    });
  });
};
const Save_Manager_Retrive_Data = (req, res) => {
  const { Empid, Value, Name } = req.params;
  let query = `
        SELECT * FROM save_all_datastored_manager_table`;

  if (Empid) {
    query += ` WHERE save_all_datastored_manager_table.Empid = ?`;

    if (Value) {
      query += ` AND save_all_datastored_manager_table.Value = ?`;

      if (Name) {
        query += ` AND save_all_datastored_manager_table.Name = ?;`;
      } else {
        query += `;`;
      }
    } else {
      query += `;`;
    }

    const queryParams = [Empid];

    if (Value) {
      queryParams.push(Value);
    }

    if (Name) {
      queryParams.push(Name);
    }

    DatabaseConnection.query(query, queryParams, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching data" });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: `Employee with Empid ${Empid} not found` });
      }

      const employeeData = {
        Empid: result[0].Empid,
        Empname: result[0].Empname,
        ratings: result.map((row) => ({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        })),
      };

      res.status(200).json({ employee: employeeData });
    });
  } else {
    DatabaseConnection.query(query, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching data" });
      }

      const employeesData = {};
      result.forEach((row) => {
        if (!employeesData[row.Empid]) {
          employeesData[row.Empid] = {
            Empid: row.Empid,
            Empname: row.Empname,
            ratings: [],
          };
        }
        employeesData[row.Empid].ratings.push({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        });
      });

      const employees = Object.values(employeesData);
      res.status(200).json({ employees });
    });
  }
};
const Save_Manager_Data_Update = (req, res) => {
  const { Data } = req.body;
  const { Empid } = req.params;

  if (!Data || !Array.isArray(Data)) {
    return res.status(400).json({ error: "Invalid request data" });
  }
  const updateQuery = `
            UPDATE save_all_datastored_manager_table
            SET QuantityTarget = ?,
                QuantityAchieved = ?,
                IndexKpi = ?,
                Comments = ?
            WHERE 
                Empid = ? AND
                Value = ? AND
                Name = ? AND
                Metric = ?`;

  const promises = [];
  Data.forEach((item) => {
    const {
      Value,
      Name,
      Metric,
      QuantityTarget,
      QuantityAchieved,
      IndexKpi,
      Comments,
    } = item;
    promises.push(
      new Promise((resolve, reject) => {
        DatabaseConnection.query(
          updateQuery,
          [
            QuantityTarget,
            QuantityAchieved,
            IndexKpi,
            Comments,
            Empid,
            Value,
            Name,
            Metric,
          ],
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      })
    );
  });
  Promise.all(promises)
    .then(() => {
      return res.json({
        success: true,
        message: "Save_Manager_Data updated successfully",
      });
    })
    .catch((err) => {
      console.error("Error updating data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while updating data." });
    });
};
const Save_Manager_Data_Delete = (req, res) => {
  const { Empid } = req.params;

  if (!Empid) {
    return res.status(400).json({ error: "Invalid Empid provided" });
  }

  const deleteQuery = `
          DELETE FROM save_all_datastored_manager_table WHERE Empid = ?;
        `;

  DatabaseConnection.query(deleteQuery, [Empid], (err, result) => {
    if (err) {
      console.error("Error deleting employee data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting employee data." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Employee data not found for the provided Empid." });
    }

    return res.json({
      success: true,
      message: "Saved_Manager data deleted successfully",
    });
  });
};
const Save_Director_Insert_Data = (req, res) => {
  const data = req.body;
  if (
    !data ||
    !data[0] ||
    !data[0].Empid ||
    !data[0].Empname ||
    !data[0].data ||
    !Array.isArray(data[0].data)
  ) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const values = [];

  for (const entry of data[0].data) {
    const { Value, valuecreater } = entry;
    for (const category of valuecreater) {
      const { name, questions } = category;
      for (const question of questions) {
        const { Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments } =
          question;

        values.push([
          data[0].Empid,
          data[0].Empname,
          Value,
          name,
          Metric,
          QuantityTarget,
          QuantityAchieved,
          IndexKpi,
          Comments,
        ]);
      }
    }
  }
  const insertQuery = `INSERT INTO save_all_datastored_director_table (Empid, Empname, Value, Name, Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments) VALUES ?`;
  DatabaseConnection.query(insertQuery, [values], (err, result) => {
    if (err) {
      console.error("Error storing data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while storing data." });
    }
    return res.json({
      success: true,
      message: "Save_director_Data stored successfully",
    });
  });
};
const Save_Director_Retrive_Data = (req, res) => {
  const { Empid, Value, Name } = req.params;
  let query = `
    SELECT * FROM save_all_datastored_director_table`;

  // Check if Empid is provided in the URL
  if (Empid) {
    query += ` WHERE save_all_datastored_manager_table.Empid = ?`;

    // If Values is provided, filter by Values
    if (Value) {
      query += ` AND save_all_datastored_manager_table.Value = ?`;

      // If Name is provided, filter by Name
      if (Name) {
        query += ` AND save_all_datastored_manager_table.Name = ?;`;
      } else {
        query += `;`;
      }
    } else {
      query += `;`;
    }

    const queryParams = [Empid];

    if (Value) {
      queryParams.push(Value);
    }

    if (Name) {
      queryParams.push(Name);
    }

    DatabaseConnection.query(query, queryParams, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching data" });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ error: `Employee with Empid ${Empid} not found` });
      }

      const employeeData = {
        Empid: result[0].Empid,
        Empname: result[0].Empname,
        ratings: result.map((row) => ({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        })),
      };

      res.status(200).json({ employee: employeeData });
    });
  } else {
    DatabaseConnection.query(query, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching data" });
      }

      const employeesData = {};
      result.forEach((row) => {
        if (!employeesData[row.Empid]) {
          employeesData[row.Empid] = {
            Empid: row.Empid,
            Empname: row.Empname,
            ratings: [],
          };
        }
        employeesData[row.Empid].ratings.push({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        });
      });

      const employees = Object.values(employeesData);
      res.status(200).json({ employees });
    });
  }
};
const Save_Director_Update_Data = (req, res) => {
  const { Data } = req.body;
  const { Empid } = req.params; // Extract Empid from URL parameters.

  // Check if 'Data' is missing or not an array.
  if (!Data || !Array.isArray(Data)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // SQL update query template.
  const updateQuery = `
        UPDATE save_all_datastored_director_table
        SET QuantityTarget = ?,
            QuantityAchieved = ?,
            IndexKpi = ?,
            Comments = ?
        WHERE 
            Empid = ? AND
            Value = ? AND
            Name = ? AND
            Metric = ?`;

  const promises = [];

  // Iterate over the 'Data' array and create promises for each data item to update the database.
  Data.forEach((item) => {
    const {
      Value,
      Name,
      Metric,
      QuantityTarget,
      QuantityAchieved,
      IndexKpi,
      Comments,
    } = item;
    promises.push(
      new Promise((resolve, reject) => {
        // Execute the SQL update query using the 'Database_Kpi' object.
        DatabaseConnection.query(
          updateQuery,
          [
            QuantityTarget,
            QuantityAchieved,
            IndexKpi,
            Comments,
            Empid,
            Value,
            Name,
            Metric,
          ],
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      })
    );
  });

  // Wait for all update promises to complete.
  Promise.all(promises)
    .then(() => {
      return res.json({
        success: true,
        message: "Save_Director_Data updated successfully",
      });
    })
    .catch((err) => {
      console.error("Error updating data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while updating data." });
    });
};
const Save_Director_Delete_Data = (req, res) => {
  const { Empid } = req.params;

  if (!Empid) {
    return res.status(400).json({ error: "Invalid Empid provided" });
  }

  const deleteQuery = `
      DELETE FROM save_all_datastored_director_table WHERE Empid = ?;
    `;

  DatabaseConnection.query(deleteQuery, [Empid], (err, result) => {
    if (err) {
      console.error("Error deleting employee data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while deleting employee data." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Employee data not found for the provided Empid." });
    }

    return res.json({
      success: true,
      message: "Saved_Manager data deleted successfully",
    });
  });
};
//mail-function
function sendDeclineEmail(Email, subject, text, callback) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "chinnaanaparthi1@gmail.com",
      pass: "fxejeeodpvlgxybq",
    },
  });

  const mailOptions = {
    from: "chinnaanaparthi1@gmail.com",
    to: Email,
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      // console.error(error);
      callback(error, null);
    } else {
      callback(null, info);
    }
  });
}
//Employee-Data
const Employee_Insert_Data = (req, res) => {
  const data = req.body;
  if (
    !data ||
    !data[0] ||
    !data[0].Empid ||
    !data[0].Empname ||
    !data[0].data ||
    !Array.isArray(data[0].data)
  ) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const values = [];

  for (const entry of data[0].data) {
    const { Value, valuecreater } = entry;
    for (const category of valuecreater) {
      const { name, questions } = category;
      for (const question of questions) {
        const { Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments } =
          question;

        values.push([
          data[0].Empid,
          data[0].Empname,
          Value,
          name,
          Metric,
          QuantityTarget,
          QuantityAchieved,
          IndexKpi,
          Comments,
        ]);
      }
    }
  }
  const insertQuery = `INSERT INTO all_datastored_employeedata_table (Empid, Empname, Value, Name, Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments) VALUES ?`;
  DatabaseConnection.query(insertQuery, [values], (err, result) => {
    if (err) {
      console.error("Error storing data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while storing data." });
    }
    return res.json({
      success: true,
      message: "Employee_Data stored successfully",
    });
  });
};
const Employee_Retrive_Data = (req, res) => {
  const { Empid, Value, Name } = req.params;

  let selectQuery = `
          SELECT Empid, Empname, Value, Name, Metric, QuantityTarget, QuantityAchieved, IndexKpi, Comments
          FROM all_datastored_employeedata_table
          WHERE 1`;

  const queryParams = [];

  if (Empid) {
    selectQuery += " AND Empid = ?";
    queryParams.push(Empid);
  }

  if (Value) {
    selectQuery += " AND Value = ?";
    queryParams.push(Value);
  }

  if (Name) {
    selectQuery += " AND Name = ?";
    queryParams.push(Name);
  }

  DatabaseConnection.query(selectQuery, queryParams, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while fetching data." });
    }

    const formattedData = [];
    let currentEmpid = null;
    let currentValue = null;
    let currentName = null;

    result.forEach((item) => {
      if (
        currentEmpid !== item.Empid ||
        currentValue !== item.Value ||
        currentName !== item.Name
      ) {
        currentEmpid = item.Empid;
        currentValue = item.Value;
        currentName = item.Name;

        formattedData.push({
          Empid: item.Empid,
          Empname: item.Empname,
          Value: item.Value,
          Name: item.Name,
          Data: [],
        });
      }

      const lastIndex = formattedData.length - 1;
      formattedData[lastIndex].Data.push({
        Metric: item.Metric,
        QuantityTarget: item.QuantityTarget,
        QuantityAchieved: item.QuantityAchieved,
        IndexKpi: item.IndexKpi,
        Comments: item.Comments,
      });
    });

    return res.json({ success: true, data: formattedData });
  });
};
const Employee_Data_Update = (req, res) => {
  const { Data } = req.body;
  const { Value, Name, Empid } = req.params;

  if (!Value || !Name || !Empid || !Data || !Array.isArray(Data)) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  const updateQuery = `
          UPDATE all_datastored_employeedata_table
          SET QuantityAchieved = ?,
              IndexKpi = ?,
              Comments = ?
          WHERE Empid = ? AND Value = ? AND Name = ? AND Metric = ?`;

  const promises = [];

  Data.forEach((item) => {
    const { Metric, QuantityAchieved, IndexKpi, Comments } = item;
    promises.push(
      new Promise((resolve, reject) => {
        DatabaseConnection.query(
          updateQuery,
          [QuantityAchieved, IndexKpi, Comments, Empid, Value, Name, Metric],
          (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          }
        );
      })
    );
  });

  Promise.all(promises)
    .then(() => {
      return res.json({
        success: true,
        message: "Employee_Data updated successfully",
      });
    })
    .catch((err) => {
      console.error("Error updating data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while updating data." });
    });
};
const Employee_All_Data_Retrieve = (req, res) => {
  const { Empid, Value, Name } = req.params;
  let query = `
      SELECT * FROM all_datastored_employeedata_table`;

  const queryParams = [];

  // Check if Empid is provided in the URL
  if (Empid) {
    query += ` WHERE Empid = ?`;
    queryParams.push(Empid);

    // If Value is provided, filter by Value
    if (Value) {
      query += ` AND Value = ?`;
      queryParams.push(Value);

      // If Name is provided, filter by Name
      if (Name) {
        query += ` AND Name = ?`;
        queryParams.push(Name);
      }
    }
  }

  DatabaseConnection.query(query, queryParams, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res
        .status(500)
        .json({ error: "An error occurred while fetching data" });
    }

    if (result.length === 0) {
      if (Empid) {
        return res
          .status(404)
          .json({ error: `Employee with Empid ${Empid} not found` });
      } else {
        return res.status(404).json({ error: "No employees found" });
      }
    }

    if (Empid) {
      const employeeData = {
        Empid: result[0].Empid,
        Empname: result[0].Empname,
        ratings: result.map((row) => ({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        })),
      };
      res.status(200).json({ employee: employeeData });
    } else {
      const employeesData = {};
      result.forEach((row) => {
        if (!employeesData[row.Empid]) {
          employeesData[row.Empid] = {
            Empid: row.Empid,
            Empname: row.Empname,
            ratings: [],
          };
        }
        employeesData[row.Empid].ratings.push({
          Value: row.Value,
          Name: row.Name,
          Metric: row.Metric,
          QuantityTarget: row.QuantityTarget,
          QuantityAchieved: row.QuantityAchieved,
          IndexKpi: row.IndexKpi,
          Comments: row.Comments,
        });
      });

      const employees = Object.values(employeesData);
      res.status(200).json({ status: true, employees });
    }
  });
};
const Employee_Status_Update = (req, res) => {
  try {
    const { Status, Email } = req.body;
    const { Empid } = req.params;

    const updateQuery =
      "UPDATE all_datastored_employeedata_table SET Status = ? WHERE Empid = ?";

    DatabaseConnection.query(updateQuery, [Status, Empid], (error, results) => {
      if (error) {
        res
          .status(500)
          .json({ error: "Error updating status in MySQL database" });
      } else if (results.affectedRows === 0) {
        res.status(404).json({
          error:
            "Record with the provided employeeId not found in the database.",
        });
      } else {
        if (Status === "Decline") {
          sendDeclineEmail(
            Email,
            "Review of Submitted Form",
            "We have reviewed your submitted form, and unfortunately, we must decline it at this time. Please review our feedback and make the necessary adjustments. Thank you..",
            (emailError, emailInfo) => {
              if (emailError) {
                res
                  .status(500)
                  .json({ error: "Error sending email notification." });
              } else {
                res.status(200).json({
                  message: "Status updated successfully, and email sent.",
                });
              }
            }
          );
        } else {
          res.status(200).json({ message: "Status updated successfully." });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error updating status in MySQL database" });
  }
};
const Employee_All_Status_Retrieve = (req, res) => {
    const { Empid } = req.params;
  
    let query = `
        SELECT Empid, Status
        FROM all_datastored_employeedata_table`;
  
    const queryParams = [];
  
    // Check if Empid is provided in the URL
    if (Empid) {
      query += ` WHERE Empid = ?`;
      queryParams.push(Empid);
    }
  
    DatabaseConnection.query(query, queryParams, (err, result) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while fetching data" });
      }
  
      if (result.length === 0) {
        if (Empid) {
          return res
            .status(404)
            .json({ error: `Employee with Empid ${Empid} not found` });
        } else {
          return res.status(404).json({ error: "No employees found" });
        }
      }
  
      if (Empid) {
        const employeeData = {
          Empid: result[0].Empid,
          Status: result[0].Status,
        };
        res.status(200).json({ employee: employeeData });
      } else {
        const employeesData = {};
        result.forEach((row) => {
          employeesData[row.Empid] = {
            Empid: row.Empid,
            Status: row.Status,
          };
        });
  
        const employees = Object.values(employeesData);
        res.status(200).json({ status: true, employees });
      }
    });
  };




// Route to handle admin registration
app.post("/admin/register", (req, res) => {
  AdminPost(req, res);
});
app.post("/admin/login", (req, res) => {
  AdminloginPost(req, res, () => {});
});
app.post("/admin/emp_insrt", (req, res, next) => {
  Admin_Employee_Insert_Data(req, res, () => {});
});
app.get("/admin/emp_data", (req, res, next) => {
  Admin_Employee_Retrive_Data(req, res, () => {});
});
app.delete(
  "/admin/emp_del/:adminID/:category?/:name?/:questions?",
  (req, res, next) => {
    Admin_Employee_Delete_Data(req, res, () => {});
  }
);
app.post("/admin/manager_insrt", (req, res, next) => {
  Admin_Manager_Insert_Data(req, res, () => {});
});
app.get("/admin/manager_data", (req, res, next) => {
  Admin_Manager_Retrive_Data(req, res, () => {});
});
app.delete(
  "/admin/manager_del/:adminID/:category?/:name?/:questions?",
  (req, res, next) => {
    Admin_Manager_Data_Delete(req, res, () => {});
  }
);
app.post("/admin/director_insrt", (req, res, next) => {
  Admin_Director_Insert_Data(req, res, () => {});
});
app.get("/admin/director_data", (req, res, next) => {
  Admin_Director_Retrive_Data(req, res, () => {});
});
app.delete(
  "/admin/director_del/:adminID/:category?/:name?/:questions?",
  (req, res, next) => {
    Admin_Director_Data_Delete(req, res, () => {});
  }
);
//Save-Data
app.post("/save/emp_insrt", (req, res, next) => {
  Save_Employee_Insert_Data(req, res, () => {});
});
app.get("/save/emp_data/:Empid?/:Value?/:Name?", (req, res, next) => {
  Save_Employee_Retrive_Data(req, res, () => {});
});
app.put("/save/emp_upd/:Empid", (req, res, next) => {
  Save_Employee_Data_Update(req, res, () => {});
});
app.delete("/save/emp_del/:Empid", (req, res, next) => {
  Save_Employee_Data_Delete(req, res, () => {});
});
app.post("/save/manager_insrt", (req, res, next) => {
  Save_Manager_Insert_Data(req, res, () => {});
});
app.get("/save/manager_data/:Empid?/:Value?/:Name?", (req, res, next) => {
  Save_Manager_Retrive_Data(req, res, () => {});
});
app.put("/save/manager_upd/:Empid", (req, res, next) => {
  Save_Manager_Data_Update(req, res, () => {});
});
app.delete("/save/manager_del/:Empid", (req, res, next) => {
  Save_Manager_Data_Delete(req, res, () => {});
});
app.post("/save/director_insrt", (req, res, next) => {
  Save_Director_Insert_Data(req, res, () => {});
});
app.get("/save/director_data/:Empid?/:Value?/:Name?", (req, res, next) => {
  Save_Director_Retrive_Data(req, res, () => {});
});
app.put("/save/director_upd/:Empid", (req, res, next) => {
  Save_Director_Update_Data(req, res, () => {});
});
app.delete("/save/director_del/:Empid", (req, res, next) => {
  Save_Director_Delete_Data(req, res, () => {});
});

//Employee-Data
app.post("/api/emp_insrt", (req, res, next) => {
  Employee_Insert_Data(req, res, () => {});
});
app.get("/api/emp_data/:Empid/:Value?/:Name?", (req, res, next) => {
  Employee_Retrive_Data(req, res, () => {});
});
app.put("/api/emp_upd/:Empid/:Value?/:Name?", (req, res, next) => {
  Employee_Data_Update(req, res, () => {});
});
app.get("/api/emp_all_data/:Empid?/:Value?/:Name?", (req, res, next) => {
  Employee_All_Data_Retrieve(req, res, () => {});
});
app.put("/api/emp_status_upd/:Empid", (req, res, next) => {
    Employee_Status_Update(req, res, () => {});
  });
  app.get("/api/emp_all_status_data/:Empid?", (req, res, next) => {
    Employee_All_Status_Retrieve(req, res, () => {});
  });




  exports.handler = async (event) => {
    try {
      const body = JSON.parse(event.body);
      let result;
  
      if (event.path === "/admin/register" && event.httpMethod === "POST") {
        result = AdminPost(body);
      } else if (
        event.path === "/admin/login" &&
        event.httpMethod === "POST"
      ) {
        result = AdminloginPost(body);
      } else if (
        event.path === "/admin/emp_insrt" &&
        event.httpMethod === "POST"
      ) {
        result = Admin_Employee_Insert_Data(body);
      } else if (event.path === "/admin/emp_data" && event.httpMethod === "GET") {
        result = Admin_Employee_Retrive_Data(body);
      } else if (
        event.path === "/admin/emp_del/:adminID/:category?/:name?/:questions?" &&
        event.httpMethod === "DELETE"
      ) {
        result = Admin_Employee_Delete_Data(body);
      } else if (event.path === "/admin/manager_insrt" && event.httpMethod === "POST") {
        result = Admin_Manager_Insert_Data(body);
      } else if (event.path === "/admin/manager_data" && event.httpMethod === "GET") {
        result = Admin_Manager_Retrive_Data(body);
      } else if (
        event.path === "/admin/manager_del/:adminID/:category?/:name?/:questions?" &&
        event.httpMethod === "DELETE"
      ) {
        result = Admin_Manager_Data_Delete(body);
      } 
      
      else if (
        event.path === "/save/emp_insrt" &&
        event.httpMethod === "POST"
      ) {
        result = Save_Employee_Insert_Data(body);
      } else if (
        event.path === "/save/emp_data/:Empid?/:Value?/:Name?" &&
        event.httpMethod === "GET"
      ) {
        result = Save_Employee_Retrive_Data(body);
      } else if (
        event.path === "/save/emp_upd/:Empid" &&
        event.httpMethod === "UPDATE"
      ) {
        result = Save_Employee_Data_Update(body);
      } else if (
        event.path === "/save/emp_del/:Empid" &&
        event.httpMethod === "DELETE"
      ) {
        result = Save_Employee_Data_Delete(body);
      } 
      
      else if (
        event.path === "/save/manager_insrt" &&
        event.httpMethod === "POST"
      ) {
        result = Save_Manager_Insert_Data(body);
      } else if (
        event.path === "/save/manager_data/:Empid?/:Value?/:Name?" &&
        event.httpMethod === "GET"
      ) {
        result = Save_Manager_Retrive_Data(body);
      } else if (
        event.path === "/save/manager_upd/:Empid" &&
        event.httpMethod === "UPDATE"
      ) {
        result = Save_Manager_Data_Update(body);
      } else if (
        event.path === "/save/manager_del/:Empid" &&
        event.httpMethod === "DELETE"
      ) {
        result = Save_Manager_Data_Delete(body);
      }
      
      
      
      else if (
        event.path === "/api/emp_insrt" &&
        event.httpMethod === "POST"
      ) {
        result = Employee_Insert_Data(body);
      } else if (
        event.path === "/api/emp_data/:Empid/:Value?/:Name?" &&
        event.httpMethod === "GET"
      ) {
        result = Employee_Retrive_Data(body);
      } else if (
        event.path === "/api/emp_upd/:Empid/:Value?/:Name?" &&
        event.httpMethod === "UPDATE"
      ) {
        result = Employee_Data_Update(body);
      } else if (
        event.path === "/api/emp_all_data/:Empid?/:Value?/:Name?" &&
        event.httpMethod === "GET"
      ) {
        result = Employee_All_Data_Retrieve(body);
      } else if (
        event.path === "/api/emp_status_upd/:Empid" &&
        event.httpMethod === "UPDATE"
      ) {
        result = Employee_Status_Update(body);
      } else if (
        event.path === "/api/emp_all_status_data/:Empid?" &&
        event.httpMethod === "GET"
      ) {
        result = Employee_All_Status_Retrieve(body);
      } else {
        throw new Error("Invalid endpoint");
      }
  
      return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: {
          "Content-Type": "application/json",
          // CORS headers to allow requests from any origin
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT, DELETE", // Include the necessary HTTP methods
        },
      };
    } catch (error) {
      console.error("Error handling Lambda event:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
        headers: {
          "Content-Type": "application/json",
          // CORS headers to allow requests from any origin
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT, DELETE", // Include the necessary HTTP methods
        },
      };
    }
  };



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
