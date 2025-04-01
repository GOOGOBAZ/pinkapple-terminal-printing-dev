require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { connect } = require('./dbConnector'); // Import the MySQL connection pool
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // If using hashed passwords
const jwt = require('jsonwebtoken'); // To generate a token for authenticated users

// Secret key for JWT (store securely in production)
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRETE || 'your_jwt_secret';

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const port = process.env.PORT || 3000;
const subscribers = {};

// Serve a basic homepage
app.get('/', (req, res) => {
  res.send('Welcome to the Notification System');
});

// // New endpoint to save transaction data
app.post('/save-savings-transactions_dev', async (req, res) => {
  console.log("Received request at /save-savings-transactions");

  const {
    TrnDate,
    AccountNumber,
    AccountName,
    SavingsMonth,
    SavingsYear,
    SavingsAdded,
    SavingsRemoved,
    SavingsRunningBalance,
    OtherOne,
    OtherTwo,
    OtherThree,
    OtherFour,
    OtherFive,
    company_name,
    branch_name,
    user_id
  } = req.body;

  // INSERT or UPDATE based on the unique index:
  // (AccountNumber, SavingsMonth, SavingsYear, company_name, branch_name)
  const upsertQuery = `
    INSERT INTO transactions_dev (
      TrnDate,
      AccountNumber,
      AccountName,
      SavingsMonth,
      SavingsYear,
      SavingsAdded,
      SavingsRemoved,
      SavingsRunningBalance,
      OtherOne,
      OtherTwo,
      OtherThree,
      OtherFour,
      OtherFive,
      company_name,
      branch_name,
      user_id,
      created_at
    )
    VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
      TrnDate = VALUES(TrnDate),
      AccountName = VALUES(AccountName),
      SavingsAdded = VALUES(SavingsAdded),
      SavingsRemoved = VALUES(SavingsRemoved),
      SavingsRunningBalance = VALUES(SavingsRunningBalance),
      OtherOne = VALUES(OtherOne),
      OtherTwo = VALUES(OtherTwo),
      OtherThree = VALUES(OtherThree),
      OtherFour = VALUES(OtherFour),
      OtherFive = VALUES(OtherFive),
      user_id = VALUES(user_id),           -- can be updated
      company_name = VALUES(company_name), -- optional, though typically wouldn't change
      branch_name = VALUES(branch_name);   -- optional, though typically wouldn't change
  `;

  try {
    await connect.query(upsertQuery, [
      TrnDate,
      AccountNumber,
      AccountName,
      SavingsMonth,
      SavingsYear,
      SavingsAdded,
      SavingsRemoved,
      SavingsRunningBalance,
      OtherOne,
      OtherTwo,
      OtherThree,
      OtherFour,
      OtherFive,
      company_name,
      branch_name,
      user_id
    ]);

    res.status(200).json({ message: 'Transaction data saved/updated successfully (by company_name & branch_name).' });
  } catch (error) {
    console.error('Error saving or updating transaction data:', error);
    res.status(500).json({ message: 'Server error while saving or updating transaction data.' });
  }
});


app.post('/save-savings-transactions', async (req, res) => {
  console.log("Received request at /save-savings-transactions");
  const {
    TrnId, TrnDate, AccountNumber, AccountName, SavingsMonth, SavingsYear, SavingsAdded,
    SavingsRemoved, SavingsRunningBalance, OtherOne, OtherTwo, OtherThree, OtherFour, OtherFive
  } = req.body;

  const upsertQuery = `
    INSERT INTO transactions (
      TrnId, TrnDate, AccountNumber, AccountName, SavingsMonth, SavingsYear, 
      SavingsAdded, SavingsRemoved, SavingsRunningBalance, OtherOne, OtherTwo, 
      OtherThree, OtherFour, OtherFive, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE 
      TrnDate=VALUES(TrnDate), AccountName=VALUES(AccountName),
      SavingsAdded=VALUES(SavingsAdded), SavingsRemoved=VALUES(SavingsRemoved),
      SavingsRunningBalance=VALUES(SavingsRunningBalance), OtherOne=VALUES(OtherOne),
      OtherTwo=VALUES(OtherTwo), OtherThree=VALUES(OtherThree),
      OtherFour=VALUES(OtherFour), OtherFive=VALUES(OtherFive);
  `;

  try {
    await connect.query(upsertQuery, [
      TrnId, TrnDate, AccountNumber, AccountName, SavingsMonth, SavingsYear,
      SavingsAdded, SavingsRemoved, SavingsRunningBalance, OtherOne, OtherTwo,
      OtherThree, OtherFour, OtherFive
    ]);
    res.status(200).json({ message: 'Transaction data saved or updated successfully.' });
  } catch (error) {
    console.error('Error saving or updating transaction data:', error);
    res.status(500).json({ message: 'Server error while saving or updating transaction data.' });
  }
});


// // New endpoint to save loan portfolio data
// app.post('/save-loan-portfolio', async (req, res) => {
//   console.log("Received request at /save-loan-portfolio");

//   const {
//     loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
//     guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
//     principal_remaining, interest_remaining, total_remaining, total_inarrears,
//     number_of_days_in_arrears, loan_status
//   } = req.body;

//   console.log(`loan_id: ${loan_id}, customer_name: ${customer_name}, customer_contact: ${customer_contact},
//     guarantor1_name: ${guarantor1_name}, guarantor1_contact: ${guarantor1_contact},
//     guarantor2_name: ${guarantor2_name}, guarantor2_contact: ${guarantor2_contact},
//     date_taken: ${date_taken}, due_date: ${due_date}, loan_taken: ${loan_taken},
//     principal_remaining: ${principal_remaining}, interest_remaining: ${interest_remaining},
//     total_remaining: ${total_remaining}, total_inarrears: ${total_inarrears},
//     number_of_days_in_arrears: ${number_of_days_in_arrears}, loan_status: ${loan_status}`);

//   const insertQuery = `
    // INSERT INTO loan_portfolio (
    //   loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
    //   guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
    //   principal_remaining, interest_remaining, total_remaining, total_inarrears,
    //   number_of_days_in_arrears, loan_status
    // )
    // VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;

//   try {
//     const [result] = await connect.query(insertQuery, [
//       loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
//       guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
//       principal_remaining, interest_remaining, total_remaining, total_inarrears,
//       number_of_days_in_arrears, loan_status
//     ]);

//     res.status(200).json({ message: 'Loan portfolio data saved successfully.' });
//   } catch (error) {
//     console.error('Error saving loan portfolio data:', error);
//     res.status(500).json({ message: 'Server error while saving loan portfolio data.' });
//   }
// });
app.post('/save-loan-portfolio', async (req, res) => {
  console.log("Received request at /save-loan-portfolio");

  const {
    loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
    guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
    principal_remaining, interest_remaining, total_remaining, total_inarrears,
    number_of_days_in_arrears, loan_status
  } = req.body;

  const upsertQuery = `
    INSERT INTO loan_portfolio (
      loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
      guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
      principal_remaining, interest_remaining, total_remaining, total_inarrears,
      number_of_days_in_arrears, loan_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      customer_name=VALUES(customer_name), customer_contact=VALUES(customer_contact),
      guarantor1_name=VALUES(guarantor1_name), guarantor1_contact=VALUES(guarantor1_contact),
      guarantor2_name=VALUES(guarantor2_name), guarantor2_contact=VALUES(guarantor2_contact),
      date_taken=VALUES(date_taken), due_date=VALUES(due_date), loan_taken=VALUES(loan_taken),
      principal_remaining=VALUES(principal_remaining), interest_remaining=VALUES(interest_remaining),
      total_remaining=VALUES(total_remaining), total_inarrears=VALUES(total_inarrears),
      number_of_days_in_arrears=VALUES(number_of_days_in_arrears), loan_status=VALUES(loan_status);
  `;

  try {
    await connect.query(upsertQuery, [
      loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
      guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
      principal_remaining, interest_remaining, total_remaining, total_inarrears,
      number_of_days_in_arrears, loan_status
    ]);
    res.status(200).json({ message: 'Loan portfolio data saved or updated successfully.' });
  } catch (error) {
    console.error('Error saving or updating loan portfolio data:', error);
    res.status(500).json({ message: 'Server error while saving or updating loan portfolio data.' });
  }
});


// Keep the existing push-notification endpoint as-is
app.post('/push-notification', async (req, res) => {
  const { phone, data } = req.body;

  try {
    const insertQuery = 'INSERT INTO reports (phone, report_data, created_at) VALUES (?, ?, UTC_TIMESTAMP())';
    await connect.query(insertQuery, [phone, data]);

    if (subscribers[phone]) {
      subscribers[phone].emit('notification', {
        message: data,
        timestamp: new Date().toISOString()
      });
      res.send(`Notification sent to subscriber with phone ${phone}`);
    } else {
      res.send(`Subscriber with phone ${phone} is not connected. Notification will be delivered when they reconnect.`);
    }
  } catch (err) {
    console.error('Error handling push notification:', err);
    res.status(500).send('Server error');
  }
});


app.get('/get-savings-transaction-per-id', async (req, res) => {
  console.log("Received request at /get-transaction");

  const { TrnId } = req.query;

  const selectQuery = `SELECT * FROM transactions WHERE TrnId = ?`;

  try {
    // Retrieve the transaction data by TrnId
    const [rows] = await connect.query(selectQuery, [TrnId]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Transaction data retrieved successfully.',
        data: rows[0]
      });
    } else {
      res.status(404).json({ message: 'Transaction not found.' });
    }
  } catch (error) {
    console.error('Error retrieving transaction data:', error);
    res.status(500).json({ message: 'Server error while retrieving transaction data.' });
  }
});



// app.get('/get-all-savings-transaction', async (req, res) => {
//   console.log("Received request at /get-transaction");

//   const { TrnId } = req.query;

//   const selectQuery = `SELECT * FROM transactions `;

//   try {
//     // Retrieve the transaction data by TrnId
//     const [rows] = await connect.query(selectQuery);

//     if (rows.length > 0) {
//       res.status(200).json({
//         message: 'Transaction data retrieved successfully.',
//         data: rows[0]
//       });
//     } else {
//       res.status(404).json({ message: 'Transaction not found.' });
//     }
//   } catch (error) {
//     console.error('Error retrieving transaction data:', error);
//     res.status(500).json({ message: 'Server error while retrieving transaction data.' });
//   }
// });

app.get('/get-all-savings-transaction', async (req, res) => {
  console.log("Received request at /get-all-savings-transaction");

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions
  `;

  try {
    // Retrieve the specified fields from all transaction data
    const [rows] = await connect.query(selectQuery);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Transaction data retrieved successfully.',
        data: rows
      });
    } else {
      res.status(404).json({ message: 'No transactions found.' });
    }
  } catch (error) {
    console.error('Error retrieving transaction data:', error);
    res.status(500).json({ message: 'Server error while retrieving transaction data.' });
  }
});



app.get('/get-all-savings-transaction-search', async (req, res) => {
  console.log("Received request at /get-all-savings-transaction");

  const searchTerm = req.query.term || '';  // Search term for filtering results
  const page = parseInt(req.query.page) || 1;  // Current page number, default is 1
  const pageSize = parseInt(req.query.pageSize) || 10;  // Results per page, default is 10
  const offset = (page - 1) * pageSize;  // Calculate the offset for pagination

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions
    WHERE AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?
    LIMIT ? OFFSET ?
  `;

  try {
    // Execute the query with pagination and search term filtering
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, pageSize, offset
    ]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Transaction data retrieved successfully.',
        data: rows,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalResults: rows.length  // This will only reflect the current page's results count
        }
      });
    } else {
      res.status(404).json({ message: 'No transactions found.' });
    }
  } catch (error) {
    console.error('Error retrieving transaction data:', error);
    res.status(500).json({ message: 'Server error while retrieving transaction data.' });
  }
});



app.get('/search-savings-transaction', async (req, res) => {
  console.log("Received request at /search-savings-transaction");

  const searchTerm = req.query.term || '';  // Get the search term from query

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions
    WHERE AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?
  `;

  try {
    // Retrieve search results from the database
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`
    ]);

    // Respond to the HTTP request with the search results
    res.status(200).json({
      message: 'Search completed successfully.',
      data: rows
    });

    // Emit search results to all WebSocket clients
    io.emit('searchResults', rows);

  } catch (error) {
    console.error('Error retrieving search results:', error);
    res.status(500).json({ message: 'Server error while retrieving search results.' });
  }
});

// app.post('/create-saving', async (req, res) => {
//   const { TrnId, amountSaved } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0) {
//     return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
//   }

//   // Start a transaction
//   const connection = await connect.getConnection(); // Get a connection from the pool

//   try {
//     await connection.beginTransaction(); // Begin transaction

//     // Update SavingsRunningBalance in the transactions table
//     const updateBalanceQuery = `
//       UPDATE transactions
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     // Fetch the updated balance along with AccountNumber and AccountName
//     const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     // Insert into savings_history with the updated balance
//     const insertHistoryQuery = `
//       INSERT INTO savings_history (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId,
//       accountNumber,
//       accountName,
//       amountSaved,
//       updatedBalance // Use the updated balance
//     ]);

//     // Commit the transaction
//     await connection.commit();

//     res.status(200).json({ message: 'Savings updated successfully.' });
//   } catch (error) {
//     await connection.rollback(); // Rollback transaction on error
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release(); // Release the connection back to the pool
//   }
// });

// app.post('/create-saving', async (req, res) => {
//   const { TrnId, amountSaved } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0) {
//     return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
//   }

//   // Start a transaction
//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Fetch company details
//     const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails WHERE the_company_details_id = 1`;
//     const [companyDetails] = await connection.query(companyDetailsQuery);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Company details not found.' });
//     }

//     // Update SavingsRunningBalance in the transactions table
//     const updateBalanceQuery = `
//       UPDATE transactions
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     // Fetch the updated balance along with AccountNumber and AccountName
//     const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     // Insert into savings_history with the updated balance
//     const insertHistoryQuery = `
//       INSERT INTO savings_history (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId,
//       accountNumber,
//       accountName,
//       amountSaved,
//       updatedBalance
//     ]);

//     // Commit the transaction
//     await connection.commit();

//     // Prepare receipt data including company and transaction details
//     const receiptData = {
//       theCompanyName: companyDetails[0].the_company_name,
//       theCompanyBranch: companyDetails[0].the_company_branch,
//       theCompanyBoxNumber: companyDetails[0].the_company_box_number,
//       AccountName: accountName,
//       SavingsPaid: amountSaved,
//       SavingsRunningBalance: updatedBalance,
//       Date: new Date().toISOString()
//     };

//     // Send the receipt data via WebSocket
//     ws.send(JSON.stringify(receiptData), error => {
//       if (error) {
//         console.error('Failed to send message via WebSocket:', error);
//         return res.status(500).json({ message: 'Failed to send receipt via WebSocket.' });
//       }

//       res.status(200).json({ message: 'Savings updated and receipt sent successfully.' });
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release();
//   }
// });


// app.post('/create-saving', async (req, res) => {
//   const { TrnId, amountSaved } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0) {
//     return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Fetch company details
//     const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails `;
//     const [companyDetails] = await connection.query(companyDetailsQuery);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Company details not found.' });
//     }

//     const updateBalanceQuery = `
//       UPDATE transactions
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     const insertHistoryQuery = `
//       INSERT INTO savings_history (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId, accountNumber, accountName, amountSaved, updatedBalance
//     ]);

//     await connection.commit();

//     // Prepare receipt data including company and transaction details
//     const receiptData = {
//       theCompanyName: companyDetails[0].the_company_name,
//       theCompanyBranch: companyDetails[0].the_company_branch,
//       theCompanyBoxNumber: companyDetails[0].the_company_box_number,
//       AccountName: accountName,
//       SavingsPaid: amountSaved,
//       SavingsRunningBalance: updatedBalance,
//       Date: new Date().toISOString()
//     };

//     // Broadcast the receipt data to all connected clients via WebSocket
//     io.emit('receiptData', receiptData);

//     res.status(200).json({ message: 'Savings updated and receipt sent successfully.' });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release();
//   }
// });


app.post('/create-saving', async (req, res) => {
  const { TrnId, amountSaved } = req.body;

  if (!TrnId || !amountSaved || amountSaved <= 0) {
    return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    // Fetch company details
    const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails `;
    const [companyDetails] = await connection.query(companyDetailsQuery);

    if (companyDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Company details not found.' });
    }

    const updateBalanceQuery = `
      UPDATE transactions
      SET SavingsRunningBalance = SavingsRunningBalance + ?
      WHERE TrnId = ?
    `;
    await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

    const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
    const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Transaction ID not found.' });
    }

    const updatedBalance = rows[0].SavingsRunningBalance;
    const accountNumber = rows[0].AccountNumber;
    const accountName = rows[0].AccountName;

    const insertHistoryQuery = `
      INSERT INTO savings_history (
        TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
      ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
    `;
    await connection.query(insertHistoryQuery, [
      TrnId, accountNumber, accountName, amountSaved, updatedBalance
    ]);

    await connection.commit();

    // Prepare receipt data including company and transaction details
    const receiptData = {
      theCompanyName: companyDetails[0].the_company_name,
      theCompanyBranch: companyDetails[0].the_company_branch,
      theCompanyBoxNumber: companyDetails[0].the_company_box_number,
      AccountName: accountName,
      SavingsPaid: amountSaved,
      SavingsRunningBalance: updatedBalance,
      Date: new Date().toISOString()
    };

    // Return the receipt data as the response
    res.status(200).json({
      message: 'Savings updated successfully.',
      receiptData: receiptData
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating savings:', error);
    res.status(500).json({ message: 'Server error while updating savings.' });
  } finally {
    connection.release();
  }
});

// app.get('/savings/unreconciled', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM savings_history WHERE Reconciled = 0`;
//     const [unreconciledSavings] = await connection.query(query);

//     res.status(200).json(unreconciledSavings);
//   } catch (error) {
//     console.error('Error fetching unreconciled savings:', error);
//     res.status(500).json({ message: 'Server error while fetching unreconciled savings.' });
//   } finally {
//     connection.release();
//   }
// });


// app.get('/savings/all', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM savings_history`;
//     const [allSavings] = await connection.query(query);

//     res.status(200).json(allSavings);
//   } catch (error) {
//     console.error('Error fetching all savings records:', error);
//     res.status(500).json({ message: 'Server error while fetching all savings records.' });
//   } finally {
//     connection.release();
//   }
// });
app.get('/savings/unreconciled', async (req, res) => {
  const connection = await connect.getConnection();

  try {
    const query = `SELECT * FROM savings_history WHERE Reconciled = 0`;
    const [unreconciledSavings] = await connection.query(query);

    // Calculate totals for SavingsPaid
    const totalsRow = {
      id: 'Totals',
      TrnId: null,
      TrnDate: null,
      AccountNumber: null,
      AccountName: 'Total',
      SavingsPaid: unreconciledSavings.reduce((sum, row) => sum + parseFloat(row.SavingsPaid || 0), 0).toFixed(2),
      SavingsRunningBalance: null,
      RECONCILED: null,
      created_at: null,
    };

    // Append totals row
    unreconciledSavings.push(totalsRow);

    res.status(200).json(unreconciledSavings);
  } catch (error) {
    console.error('Error fetching unreconciled savings:', error);
    res.status(500).json({ message: 'Server error while fetching unreconciled savings.' });
  } finally {
    connection.release();
  }
});

app.get('/savings/all', async (req, res) => {
  const connection = await connect.getConnection();

  try {
    const query = `SELECT * FROM savings_history`;
    const [allSavings] = await connection.query(query);

    // Calculate totals for SavingsPaid
    const totalsRow = {
      id: 'Totals',
      TrnId: null,
      TrnDate: null,
      AccountNumber: null,
      AccountName: 'Total',
      SavingsPaid: allSavings.reduce((sum, row) => sum + parseFloat(row.SavingsPaid || 0), 0).toFixed(2),
      SavingsRunningBalance: null,
      RECONCILED: null,
      created_at: null,
    };

    // Append totals row
    allSavings.push(totalsRow);

    res.status(200).json(allSavings);
  } catch (error) {
    console.error('Error fetching all savings records:', error);
    res.status(500).json({ message: 'Server error while fetching all savings records.' });
  } finally {
    connection.release();
  }
});


app.post('/savings/reconcile', async (req, res) => {
  const { id } = req.body;  // Expect an array of IDs to be reconciled

  if (!id || !Array.isArray(id) || id.length === 0) {
    return res.status(400).json({ message: 'Invalid or missing IDs.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    const query = `UPDATE savings_history SET Reconciled = 1 WHERE id IN (?)`;
    await connection.query(query, [id]);

    await connection.commit();
    res.status(200).json({ message: 'Savings records marked as reconciled successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error reconciling savings records:', error);
    res.status(500).json({ message: 'Server error while reconciling savings records.' });
  } finally {
    connection.release();
  }
});



app.get('/get-all-loan-transactions', async (req, res) => {
  console.log("Received request at /get-all-loan-transactions");

  const selectQuery = `
    SELECT loan_id, customer_name, customer_contact, loan_taken, principal_remaining, interest_remaining, total_remaining, total_inarrears, number_of_days_in_arrears, loan_status
    FROM loan_portfolio
  `;

  try {
    const [rows] = await connect.query(selectQuery);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Loan data retrieved successfully.',
        data: rows
      });
    } else {
      res.status(404).json({ message: 'No loans found.' });
    }
  } catch (error) {
    console.error('Error retrieving loan data:', error);
    res.status(500).json({ message: 'Server error while retrieving loan data.' });
  }
});


app.get('/get-all-loan-transactions-search', async (req, res) => {
  console.log("Received request at /get-all-loan-transactions-search");

  const searchTerm = req.query.term || '';
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  const selectQuery = `
    SELECT loan_id, customer_name, customer_contact, loan_taken, principal_remaining, interest_remaining, total_remaining, total_inarrears, number_of_days_in_arrears, loan_status
    FROM loan_portfolio
    WHERE customer_name LIKE ? OR customer_contact LIKE ? OR loan_id LIKE ?
    LIMIT ? OFFSET ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, pageSize, offset
    ]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Loan data retrieved successfully.',
        data: rows,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalResults: rows.length  // Reflects current page results count
        }
      });
    } else {
      res.status(404).json({ message: 'No loans found.' });
    }
  } catch (error) {
    console.error('Error retrieving loan data:', error);
    res.status(500).json({ message: 'Server error while retrieving loan data.' });
  }
});


app.get('/search-loan-transaction', async (req, res) => {
  console.log("Received request at /search-loan-transaction");

  const searchTerm = req.query.term || '';

  const selectQuery = `
    SELECT loan_id, customer_name, customer_contact, loan_taken, principal_remaining, interest_remaining, total_remaining, total_inarrears, number_of_days_in_arrears, loan_status
    FROM loan_portfolio
    WHERE customer_name LIKE ? OR customer_contact LIKE ? OR loan_id LIKE ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`
    ]);

    res.status(200).json({
      message: 'Loan search completed successfully.',
      data: rows
    });

    io.emit('loanSearchResults', rows);  // Emit loan search results via WebSocket
  } catch (error) {
    console.error('Error retrieving loan search results:', error);
    res.status(500).json({ message: 'Server error while retrieving loan search results.' });
  }
});


app.post('/create-loan-payment', async (req, res) => {
  const { loan_id, amountPaid } = req.body;

  if (!loan_id || !amountPaid || amountPaid <= 0) {
    return res.status(400).json({ message: 'Invalid loan ID or amount paid.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    // Fetch company details (if applicable)
    const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails`;
    const [companyDetails] = await connection.query(companyDetailsQuery);

    if (companyDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Company details not found.' });
    }

    // Fetch the current loan balance and check if the loan exists
    const getLoanBalanceQuery = `SELECT total_remaining, customer_name, customer_contact FROM loan_portfolio WHERE loan_id = ?`;
    const [loanRows] = await connection.query(getLoanBalanceQuery, [loan_id]);

    if (loanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Loan ID not found.' });
    }

    const updatedBalance = loanRows[0].total_remaining - amountPaid;
    const customerName = loanRows[0].customer_name;
    const customerContact = loanRows[0].customer_contact;

    // Update the remaining balance in the loan portfolio
    const updateLoanBalanceQuery = `
      UPDATE loan_portfolio
      SET total_remaining = ?
      WHERE loan_id = ?
    `;
    await connection.query(updateLoanBalanceQuery, [updatedBalance, loan_id]);

    // Insert payment details into the loan_paid table
    const insertPaymentHistoryQuery = `
      INSERT INTO loan_paid (
        customer_number, customer_name, customer_contact, amount_paid, outstanding_total_amount, trxn_date, Reconciled
      ) VALUES (?, ?, ?, ?, ?, NOW(), 0)
    `;
    await connection.query(insertPaymentHistoryQuery, [
      loan_id, customerName, customerContact, amountPaid, updatedBalance
    ]);

    await connection.commit();

    // Prepare receipt data including company and loan details
    const receiptData = {
      theCompanyName: companyDetails[0].the_company_name,
      theCompanyBranch: companyDetails[0].the_company_branch,
      theCompanyBoxNumber: companyDetails[0].the_company_box_number,
      customerName: customerName,
      amountPaid: amountPaid,
      outstandingTotalAmount: updatedBalance,
      Date: new Date().toISOString()
    };

    // Return the receipt data as the response
    res.status(200).json({
      message: 'Loan payment recorded successfully.',
      receiptData: receiptData
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error recording loan payment:', error);
    res.status(500).json({ message: 'Server error while recording loan payment.' });
  } finally {
    connection.release();
  }
});

app.get('/loans/unreconciled', async (req, res) => {
  const connection = await connect.getConnection();

  try {
    const query = `SELECT * FROM loan_paid WHERE reconciled = 0`;
    const [unreconciledLoans] = await connection.query(query);

    // Calculate totals for amount_paid
    const totalsRow = {
      id: 'Totals',
      customer_number: null,
      customer_name: 'Total',
      customer_contact: null,
      amount_paid: unreconciledLoans.reduce((sum, row) => sum + parseFloat(row.amount_paid || 0), 0).toFixed(2),
      outstanding_total_amount: null,
      trxn_date: null,
      reconciled: null,
    };

    // Append totals row
    unreconciledLoans.push(totalsRow);

    res.status(200).json(unreconciledLoans);
  } catch (error) {
    console.error('Error fetching unreconciled loans:', error);
    res.status(500).json({ message: 'Server error while fetching unreconciled loans.' });
  } finally {
    connection.release();
  }
});

app.get('/loans/all', async (req, res) => {
  const connection = await connect.getConnection();

  try {
    const query = `SELECT * FROM loan_paid`;
    const [allLoans] = await connection.query(query);

    // Calculate totals for amount_paid
    const totalsRow = {
      id: 'Totals',
      customer_number: null,
      customer_name: 'Total',
      customer_contact: null,
      amount_paid: allLoans.reduce((sum, row) => sum + parseFloat(row.amount_paid || 0), 0).toFixed(2),
      outstanding_total_amount: null,
      trxn_date: null,
      reconciled: null,
    };

    // Append totals row
    allLoans.push(totalsRow);

    res.status(200).json(allLoans);
  } catch (error) {
    console.error('Error fetching all loan records:', error);
    res.status(500).json({ message: 'Server error while fetching all loan records.' });
  } finally {
    connection.release();
  }
});


// app.get('/loans/unreconciled', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM loan_paid WHERE Reconciled = 0`;
//     const [unreconciledLoans] = await connection.query(query);

//     res.status(200).json(unreconciledLoans);
//   } catch (error) {
//     console.error('Error fetching unreconciled loans:', error);
//     res.status(500).json({ message: 'Server error while fetching unreconciled loans.' });
//   } finally {
//     connection.release();
//   }
// });


// app.get('/loans/all', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM loan_paid`;
//     const [allLoans] = await connection.query(query);

//     res.status(200).json(allLoans);
//   } catch (error) {
//     console.error('Error fetching all loan records:', error);
//     res.status(500).json({ message: 'Server error while fetching all loan records.' });
//   } finally {
//     connection.release();
//   }
// });


app.post('/loans/reconcile', async (req, res) => {
  const { id } = req.body;  // Expect an array of loan payment IDs to reconcile

  if (!id || !Array.isArray(id) || id.length === 0) {
    return res.status(400).json({ message: 'Invalid or missing IDs.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    const query = `UPDATE loan_paid SET Reconciled = 1 WHERE id IN (?)`;
    await connection.query(query, [id]);

    await connection.commit();
    res.status(200).json({ message: 'Loan payments marked as reconciled successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error reconciling loan payments:', error);
    res.status(500).json({ message: 'Server error while reconciling loan payments.' });
  } finally {
    connection.release();
  }
});



// Authentication route
app.post('/login', async (req, res) => {
  const { user_id, p_word_login } = req.body;

  // Validate input
  if (!user_id || !p_word_login) {
    return res.status(400).json({ message: 'User ID and password are required.' });
  }

  const connection = await connect.getConnection();

  try {
    // Fetch user details from the log_in table
    const query = `SELECT user_id, p_word_login, account_name, role FROM log_in WHERE user_id = ?`;
    const [userRows] = await connection.query(query, [user_id]);

    // Check if user exists
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = userRows[0];

    // Verify password (use bcrypt.compare if passwords are hashed)
    if (user.p_word_login !== p_word_login) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT token (set expiration as needed, e.g., '1h' for 1 hour)
    const token = jwt.sign(
      { user_id: user.user_id, account_name: user.account_name, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send response with token
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        account_name: user.account_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(500).json({ message: 'Server error during authentication.' });
  } finally {
    connection.release();
  }
});



io.on('connection', (socket) => {
  console.log('A new client connected via WebSocket');

  // Client disconnect event
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  // The WebSocket client listens to 'searchResults' event
  socket.on('search', (searchTerm) => {
    // Trigger a search on receiving a search term (if needed)
    console.log(`WebSocket search initiated with term: ${searchTerm}`);
    // Alternatively, you could call the same `selectQuery` here if you want 
    // WebSocket to independently fetch results instead of relying on the HTTP request.
  });
});





// Socket.IO connection management
io.on('connection', (socket) => {
  console.log('A new client connected');

  socket.on('register', async (phone) => {
    console.log(`Subscriber with phone ${phone} connected`);
    subscribers[phone] = socket;

    try {
      const selectQuery = `
        SELECT report_data, CONVERT_TZ(created_at, @@session.time_zone, '+00:00') AS created_at 
        FROM reports 
        WHERE phone = ? 
        AND created_at >= UTC_TIMESTAMP() - INTERVAL 8 DAY 
        ORDER BY created_at ASC
      `;
      const [results] = await connect.query(selectQuery, [phone]);

      if (results.length > 0) {
        const reportArray = results.map((report) => ({
          message: report.report_data,
          timestamp: report.created_at
        }));
        socket.emit('notification', { reports: reportArray });
      } else {
        socket.emit('notification', { message: "Welcome to pinkapple reports app. We will send you the reports as they come in." });
      }
    } catch (err) {
      console.error('Error fetching reports for the subscriber:', err);
      socket.emit('notification', { message: "An error occurred while fetching your reports. Please try again later." });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (let [phone, value] of Object.entries(subscribers)) {
      if (value === socket) {
        delete subscribers[phone];
        console.log(`Subscriber with phone ${phone} disconnected`);
        break;
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
