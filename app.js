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
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRETE || '7eca8315-6123-40fc-9e36-e01decb2384c';

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
  console.log(req.body);
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



app.post('/save-loan-portfolio-dev', async (req, res) => {
  const connection = await connect.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    } = req.body;

    const upsertQuery = `
      INSERT INTO loan_portfolio_dev (
        loan_id,
        customer_name,
        customer_contact,
        guarantor1_name,
        guarantor1_contact,
        guarantor2_name,
        guarantor2_contact,
        date_taken,
        due_date,
        loan_taken,
        principal_remaining,
        interest_remaining,
        total_remaining,
        total_inarrears,
        number_of_days_in_arrears,
        loan_status,
        company_name,
        branch_name,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        customer_contact = VALUES(customer_contact),
        guarantor1_name = VALUES(guarantor1_name),
        guarantor1_contact = VALUES(guarantor1_contact),
        guarantor2_name = VALUES(guarantor2_name),
        guarantor2_contact = VALUES(guarantor2_contact),
        date_taken = VALUES(date_taken),
        due_date = VALUES(due_date),
        loan_taken = VALUES(loan_taken),
        principal_remaining = VALUES(principal_remaining),
        interest_remaining = VALUES(interest_remaining),
        total_remaining = VALUES(total_remaining),
        total_inarrears = VALUES(total_inarrears),
        number_of_days_in_arrears = VALUES(number_of_days_in_arrears),
        loan_status = VALUES(loan_status),
        user_id = VALUES(user_id);
    `;

    await connection.query(upsertQuery, [
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    ]);

    const [rows] = await connection.query(`
      SELECT * 
      FROM loan_portfolio_dev 
      WHERE loan_id = ? 
        AND company_name = ?
        AND branch_name = ?
    `, [loan_id, company_name, branch_name]);

    await connection.commit();

    res.status(200).json({
      message: 'Loan portfolio data saved or updated successfully.',
      data: rows.length ? rows[0] : {}
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving or updating loan portfolio data:', error);
    res.status(500).json({
      message: 'Server error while saving or updating loan portfolio data.'
    });
  } finally {
    connection.release();
  }
});



// Endpoint to retrieve all savings transactions filtered by branch and company

app.get('/get-all-savings-transaction_dev', async (req, res) => {
  const { company_name, branch_name } = req.query;

  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions_dev
    WHERE company_name = ? AND branch_name = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [company_name, branch_name]);

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



app.get('/get-all-savings-transaction-search_dev', async (req, res) => {
  const { company_name, branch_name } = req.query;

  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const searchTerm = req.query.term || '';
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions_dev
    WHERE (AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?)
      AND company_name = ? AND branch_name = ?
    LIMIT ? OFFSET ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, company_name, branch_name, pageSize, offset
    ]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Transaction data retrieved successfully.',
        data: rows,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalResults: rows.length
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



app.get('/search-savings-transaction_dev', async (req, res) => {
  const { company_name, branch_name } = req.query;

  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const searchTerm = req.query.term || '';

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions_dev
    WHERE (AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?)
      AND company_name = ? AND branch_name = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, company_name, branch_name
    ]);

    res.status(200).json({
      message: 'Search completed successfully.',
      data: rows
    });

    io.emit('searchResults', rows);

  } catch (error) {
    console.error('Error retrieving search results:', error);
    res.status(500).json({ message: 'Server error while retrieving search results.' });
  }
});


// app.post('/create-saving_dev', async (req, res) => {
//   const { TrnId, amountSaved, company_name, branch_name, user_id } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0 || !company_name || !branch_name || !user_id) {
//     return res.status(400).json({ message: 'Invalid input parameters.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Fetch company details based on body parameters
//     const companyDetailsQuery = `
//       SELECT the_company_name, the_company_branch, the_company_box_number
//       FROM the_company_datails_dev
//       WHERE company_name = ? AND branch_name = ?
//     `;
//     const [companyDetails] = await connection.query(companyDetailsQuery, [company_name, branch_name]);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Company details not found.' });
//     }

//     const updateBalanceQuery = `
//       UPDATE transactions_dev
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     const getUpdatedBalanceQuery = `
//       SELECT SavingsRunningBalance, AccountNumber, AccountName
//       FROM transactions_dev
//       WHERE TrnId = ?
//     `;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     const insertHistoryQuery = `
//       INSERT INTO savings_history_dev (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, company_name, branch_name, user_id, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, ?, ?, ?, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId, accountNumber, accountName, amountSaved, updatedBalance, company_name, branch_name, user_id
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

//     // Return the receipt data as the response
//     res.status(200).json({
//       message: 'Savings updated successfully.',
//       receiptData: receiptData
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release();
//   }
// });

// Example import of your JWT middleware and DB connection
// const { authenticateJWT } = require('./jwtMiddleware');
// const connect = require('./db');  // or wherever you export connect.getConnection()

app.post('/create-saving_dev', authenticateJWT, async (req, res) => {
  // 1) Extract the fields from the body that you still need
  const { TrnId, amountSaved } = req.body;

  // 2) Extract the fields from the JWT-decoded data in `req.user`
  const { company_name, branch_name, local_user_id } = req.user;

  // 3) Validate input
  if (!TrnId || !amountSaved || amountSaved <= 0) {
    return res.status(400).json({ message: 'Invalid input parameters for savings creation.' });
  }

  let connection;
  try {
    connection = await connect.getConnection();
    await connection.beginTransaction();

    // 4) Fetch company details based on the company_name & branch_name from the token
    const companyDetailsQuery = `
      SELECT the_company_name, the_company_branch, the_company_box_number
      FROM the_company_datails_dev
      WHERE company_name = ?
        AND branch_name  = ?
      LIMIT 1
    `;
    const [companyDetails] = await connection.query(companyDetailsQuery, [company_name, branch_name]);

    if (companyDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Company details not found in the DB.' });
    }

    // 5) Update the savings balance in transactions_dev
    const updateBalanceQuery = `
      UPDATE transactions_dev
      SET SavingsRunningBalance = SavingsRunningBalance + ?
      WHERE TrnId = ?
    `;
    await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

    // 6) Retrieve the updated balance
    const getUpdatedBalanceQuery = `
      SELECT SavingsRunningBalance, AccountNumber, AccountName
      FROM transactions_dev
      WHERE TrnId = ?
      LIMIT 1
    `;
    const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Transaction ID not found in transactions_dev.' });
    }

    const updatedBalance = rows[0].SavingsRunningBalance;
    const accountNumber  = rows[0].AccountNumber;
    const accountName    = rows[0].AccountName;

    // 7) Insert a record into savings_history_dev
    const insertHistoryQuery = `
      INSERT INTO savings_history_dev (
        TrnId, TrnDate, AccountNumber, AccountName, 
        SavingsPaid, SavingsRunningBalance, 
        RECONCILED, company_name, branch_name, user_id, created_at
      )
      VALUES (?, NOW(), ?, ?, ?, ?, FALSE, ?, ?, ?, UTC_TIMESTAMP())
    `;
    await connection.query(insertHistoryQuery, [
      TrnId,
      accountNumber,
      accountName,
      amountSaved,
      updatedBalance,
      company_name,
      branch_name,
      local_user_id
    ]);

    // 8) Commit the transaction
    await connection.commit();

    // 9) Prepare receipt data
    const receiptData = {
      theCompanyName:        companyDetails[0].the_company_name,
      theCompanyBranch:      companyDetails[0].the_company_branch,
      theCompanyBoxNumber:   companyDetails[0].the_company_box_number,
      AccountName:           accountName,
      SavingsPaid:           amountSaved,
      SavingsRunningBalance: updatedBalance,
      Date:                  new Date().toISOString()
    };

    // 10) Return success
    res.status(200).json({
      message: 'Savings updated successfully.',
      receiptData: receiptData
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating savings:', error);
    res.status(500).json({ message: 'Server error while updating savings.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// Endpoint to fetch all unreconciled savings records filtered by branch and company

app.get('/savings/unreconciled_dev', async (req, res) => {
  const { company_name, branch_name } = req.query;

  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const connection = await connect.getConnection();

  try {
    const query = `
      SELECT * 
      FROM savings_history_dev 
      WHERE Reconciled = 0 AND company_name = ? AND branch_name = ?
    `;
    const [unreconciledSavings] = await connection.query(query, [company_name, branch_name]);

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





app.post('/savings/reconcile_dev', async (req, res) => {
  const { id } = req.body;  // Expect an array of IDs to be reconciled

  if (!id || !Array.isArray(id) || id.length === 0) {
    return res.status(400).json({ message: 'Invalid or missing IDs.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    const query = `UPDATE savings_history_dev SET Reconciled = 1 WHERE id IN (?)`;
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



app.get('/get-all-loan-transactions_dev', async (req, res) => {
  console.log("Received request at /get-all-loan-transactions_dev");

  const { company_name, branch_name } = req.query;

  // Optional: make sure both are provided
  if (!company_name || !branch_name) {
    return res.status(400).json({
      message: "Please provide both 'company_name' and 'branch_name'."
    });
  }

  const selectQuery = `
    SELECT
      id,
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    FROM loan_portfolio_dev
    WHERE company_name = ?
      AND branch_name = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [company_name, branch_name]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Loan data retrieved successfully.',
        data: rows
      });
    } else {
      res.status(404).json({
        message: 'No loans found for the specified company and branch.'
      });
    }
  } catch (error) {
    console.error('Error retrieving loan data:', error);
    res.status(500).json({
      message: 'Server error while retrieving loan data.'
    });
  }
});


app.get('/get-all-loan-transactions-search_dev', async (req, res) => {
  console.log("Received request at /get-all-loan-transactions-search_dev");

  // Read query parameters
  const searchTerm   = req.query.term         || '';
  const companyName  = req.query.company_name || '';
  const branchName   = req.query.branch_name  || '';
  const page         = parseInt(req.query.page) || 1;
  const pageSize     = parseInt(req.query.pageSize) || 10;
  const offset       = (page - 1) * pageSize;

  // Optional: Validate required fields
  if (!companyName || !branchName) {
    return res.status(400).json({
      message: "Please provide 'company_name' and 'branch_name'."
    });
  }

  // Adjust SELECT columns if you want more fields returned
  const selectQuery = `
    SELECT
      id,
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    FROM loan_portfolio_dev
    WHERE (customer_name  LIKE ?
       OR  customer_contact LIKE ?
       OR  loan_id         LIKE ?)
      AND company_name = ?
      AND branch_name  = ?
    LIMIT ? OFFSET ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`,  // for customer_name
      `%${searchTerm}%`,  // for customer_contact
      `%${searchTerm}%`,  // for loan_id
      companyName, 
      branchName,
      pageSize,
      offset
    ]);

    // You may want to calculate total count separately for full pagination
    // For now, the "totalResults" below just says how many are on this current page.
    res.status(200).json({
      message: 'Loan data retrieved successfully.',
      data: rows,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        resultsOnThisPage: rows.length
      }
    });
  } catch (error) {
    console.error('Error retrieving loan data:', error);
    res.status(500).json({ 
      message: 'Server error while retrieving loan data.' 
    });
  }
});


app.get('/search-loan-transaction_dev', async (req, res) => {
  console.log("Received request at /search-loan-transaction_dev");

  // Read query parameters
  const searchTerm   = req.query.term         || '';
  const companyName  = req.query.company_name || '';
  const branchName   = req.query.branch_name  || '';

  // Optional: Validate required fields
  if (!companyName || !branchName) {
    return res.status(400).json({
      message: "Please provide 'company_name' and 'branch_name'."
    });
  }

  const selectQuery = `
    SELECT
      id,
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    FROM loan_portfolio_dev
    WHERE (customer_name  LIKE ?
       OR  customer_contact LIKE ?
       OR  loan_id         LIKE ?)
      AND company_name = ?
      AND branch_name  = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      companyName,
      branchName
    ]);

    // Return all matching rows
    res.status(200).json({
      message: 'Loan search completed successfully.',
      data: rows
    });

    // Emit via socket.io if desired
    io.emit('loanSearchResults', rows);
  } catch (error) {
    console.error('Error retrieving loan search results:', error);
    res.status(500).json({
      message: 'Server error while retrieving loan search results.'
    });
  }
});


/**
 * Middleware: authenticate and extract fields from JWT.
 * 
 * 1) Expects a header: "Authorization: Bearer <token>"
 * 2) Decodes the token with JWT_SECRET
 * 3) Attaches **all** decoded fields to req.user
 * 4) Calls next() if valid, or returns a 401/403 if not
 */
function authenticateJWT(req, res, next) {
  // 1) Grab the Authorization header
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No Authorization header provided.' });
  }

  // 2) Parse out the Bearer token
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization format. Expected Bearer token.' });
  }

  // 3) Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    // 4) Attach **all** decoded fields from the token to req.user.
    //    (Below is an example set — adjust to match whatever you include in the JWT.)
    req.user = {
      user_id: decoded.user_id,
      local_user_id: decoded.local_user_id,
      unique_user_code: decoded.unique_user_code,
      first_name: decoded.first_name,
      last_name: decoded.last_name,
      title: decoded.title,
      role: decoded.role,
      company_name: decoded.company_name,
      branch_name: decoded.branch_name,
      last_login: decoded.last_login,
      // If you REALLY included these in the JWT payload (not recommended):
      password_hash: decoded.password_hash,
      refresh_token: decoded.refresh_token,
      refresh_expires_at: decoded.refresh_expires_at,
      account_number: decoded.account_number,
      account_name: decoded.account_name,
      birth_date: decoded.birth_date,
      recruitement_date: decoded.recruitement_date,
      line_manager: decoded.line_manager,
      former_employment: decoded.former_employment,
      creation_time: decoded.creation_time,
      last_token_issued_at: decoded.last_token_issued_at,
      // ...any other fields you genuinely included in the token
    };

    // Proceed to the next middleware or route handler
    next();
  });
}

module.exports = {
  authenticateJWT
};



// app.post('/create-loan-payment_dev', async (req, res) => {
//   const {
//     id,
//     amountPaid,
//     company_name,
//     branch_name,
//     user_id
//   } = req.body;

//   // Validate the required fields
//   if (
//     !id ||
//     !amountPaid ||
//     amountPaid <= 0 ||
//     !company_name ||
//     !branch_name ||
//     !user_id
//   ) {
//     return res.status(400).json({
//       message: 'Please provide a valid id, amountPaid (>0), company_name, branch_name, and user_id.'
//     });
//   }

//   let connection;
//   try {
//     // 1) Get a connection and start a transaction
//     connection = await connect.getConnection();
//     await connection.beginTransaction();

//     // 2) Fetch company details by company_name and branch_name
//     const companyDetailsQuery = `
//       SELECT the_company_name,
//              the_company_branch,
//              the_company_box_number
//       FROM the_company_datails_dev
//       WHERE the_company_name = ?
//         AND the_company_branch = ?
//       LIMIT 1
//     `;
//     const [companyDetails] = await connection.query(companyDetailsQuery, [
//       company_name,
//       branch_name
//     ]);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         message: 'Company details not found for the specified name and branch.'
//       });
//     }

//     // 3) Fetch the current loan balance from loan_portfolio_dev by ID, company, and branch
//     const getLoanBalanceQuery = `
//       SELECT id,
//              loan_id,  -- still stored if needed for the receipt
//              total_remaining,
//              customer_name,
//              customer_contact
//       FROM loan_portfolio_dev
//       WHERE id = ?
//         AND company_name = ?
//         AND branch_name  = ?
//       LIMIT 1
//     `;
//     const [loanRows] = await connection.query(getLoanBalanceQuery, [
//       id,
//       company_name,
//       branch_name
//     ]);

//     if (loanRows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({
//         message: 'No matching loan record found for the given ID, company, and branch.'
//       });
//     }

//     const currentBalance = parseFloat(loanRows[0].total_remaining) || 0;
//     const updatedBalance = currentBalance - amountPaid;

//     // 3a) Prevent paying more than the outstanding balance
//     if (amountPaid > currentBalance) {
//       await connection.rollback();
//       return res.status(400).json({
//         message: 'Amount paid cannot exceed the outstanding balance.'
//       });
//     }

//     const customerName    = loanRows[0].customer_name;
//     const customerContact = loanRows[0].customer_contact;
//     const loanId          = loanRows[0].loan_id; // If you still need it for your receipt

//     // 4) Update the remaining balance in loan_portfolio_dev
//     const updateLoanBalanceQuery = `
//       UPDATE loan_portfolio_dev
//       SET total_remaining = ?
//       WHERE id = ?
//         AND company_name = ?
//         AND branch_name = ?
//     `;
//     await connection.query(updateLoanBalanceQuery, [
//       updatedBalance,
//       id,
//       company_name,
//       branch_name
//     ]);

//     // 5) Insert payment details into loan_paid_dev
//     const insertPaymentHistoryQuery = `
//       INSERT INTO loan_paid_dev (
//         customer_number,
//         customer_name,
//         customer_contact,
//         amount_paid,
//         outstanding_total_amount,
//         trxn_date,
//         Reconciled,
//         user_id,
//         company_name,
//         branch_name
//       )
//       VALUES (?, ?, ?, ?, ?, NOW(), 0, ?, ?, ?)
//     `;
//     await connection.query(insertPaymentHistoryQuery, [
//       // Decide what you want stored as 'customer_number'—the textual loan_id or numeric id.
//       loanId || id,
//       customerName,
//       customerContact,
//       amountPaid,
//       updatedBalance,
//       user_id,
//       company_name,
//       branch_name
//     ]);

//     // 6) Commit the transaction
//     await connection.commit();

//     // 7) Prepare the receipt data
//     const receiptData = {
//       theCompanyName:      companyDetails[0].the_company_name,
//       theCompanyBranch:    companyDetails[0].the_company_branch,
//       theCompanyBoxNumber: companyDetails[0].the_company_box_number,
//       loanId:              loanId || `ID: ${id}`,
//       customerName:        customerName,
//       amountPaid:          amountPaid,
//       outstandingTotalAmount: updatedBalance,
//       date:                new Date().toISOString()
//     };

//     // 8) Return success response and receipt data
//     return res.status(200).json({
//       message: 'Loan payment recorded successfully.',
//       receiptData: receiptData
//     });
//   } catch (error) {
//     // Roll back and return error on any failure
//     if (connection) {
//       await connection.rollback();
//     }
//     console.error('Error recording loan payment:', error);
//     return res.status(500).json({
//       message: 'Server error while recording loan payment.'
//     });
//   } finally {
//     // Release connection
//     if (connection) {
//       connection.release();
//     }
//   }
// });


// At the top of your file, import the middleware
// const { authenticateJWT } = require('./jwtMiddleware');

// Then apply it to your route
app.post('/create-loan-payment_dev', authenticateJWT, async (req, res) => {
  // 1) Now you only need to read from the body what’s NOT in the JWT:
  //    e.g. the `id` of the loan, the `amountPaid`, etc.
  const { id, amountPaid } = req.body;

  // 2) Extract the company/branch/user from the JWT payload (set in the middleware)
  const { local_user_id, company_name, branch_name } = req.user;

  // Validate the required fields
  if (!id || !amountPaid || amountPaid <= 0) {
    return res.status(400).json({
      message: 'Please provide a valid loan "id" and "amountPaid" > 0.'
    });
  }

  let connection;
  try {
    // a) Get a connection and start a transaction
    connection = await connect.getConnection();
    await connection.beginTransaction();

    // b) Fetch company details by company_name and branch_name
    const companyDetailsQuery = `
      SELECT the_company_name,
             the_company_branch,
             the_company_box_number
      FROM the_company_datails_dev
      WHERE the_company_name = ?
        AND the_company_branch = ?
      LIMIT 1
    `;
    const [companyDetails] = await connection.query(companyDetailsQuery, [
      company_name,
      branch_name
    ]);

    if (companyDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Company details not found for the specified name and branch.'
      });
    }

    // c) Fetch the loan record by ID, company, and branch
    const getLoanBalanceQuery = `
      SELECT id,
             loan_id,
             total_remaining,
             customer_name,
             customer_contact
      FROM loan_portfolio_dev
      WHERE id = ?
        AND company_name = ?
        AND branch_name  = ?
      LIMIT 1
    `;
    const [loanRows] = await connection.query(getLoanBalanceQuery, [
      id,
      company_name,
      branch_name
    ]);

    if (loanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'No matching loan record found for the given ID, company, and branch.'
      });
    }

    const currentBalance = parseFloat(loanRows[0].total_remaining) || 0;
    const updatedBalance = currentBalance - amountPaid;

    // d) Prevent paying more than the outstanding balance
    if (amountPaid > currentBalance) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Amount paid cannot exceed the outstanding balance.'
      });
    }

    const customerName    = loanRows[0].customer_name;
    const customerContact = loanRows[0].customer_contact;
    const loanId          = loanRows[0].loan_id; // For receipt or references

    // e) Update the remaining balance in loan_portfolio_dev
    const updateLoanBalanceQuery = `
      UPDATE loan_portfolio_dev
      SET total_remaining = ?
      WHERE id = ?
        AND company_name = ?
        AND branch_name = ?
    `;
    await connection.query(updateLoanBalanceQuery, [
      updatedBalance,
      id,
      company_name,
      branch_name
    ]);

    // f) Insert payment details into loan_paid_dev
    const insertPaymentHistoryQuery = `
      INSERT INTO loan_paid_dev (
        customer_number,
        customer_name,
        customer_contact,
        amount_paid,
        outstanding_total_amount,
        trxn_date,
        Reconciled,
        user_id,
        company_name,
        branch_name
      )
      VALUES (?, ?, ?, ?, ?, NOW(), 0, ?, ?, ?)
    `;
    await connection.query(insertPaymentHistoryQuery, [
      loanId || id,     // or whichever makes sense for 'customer_number'
      customerName,
      customerContact,
      amountPaid,
      updatedBalance,
      local_user_id,    // user_id from JWT
      company_name,
      branch_name
    ]);

    // g) Commit the transaction
    await connection.commit();

    // h) Prepare the receipt data
    const receiptData = {
      theCompanyName:      companyDetails[0].the_company_name,
      theCompanyBranch:    companyDetails[0].the_company_branch,
      theCompanyBoxNumber: companyDetails[0].the_company_box_number,
      loanId:              loanId || `ID: ${id}`,
      customerName:        customerName,
      amountPaid:          amountPaid,
      outstandingTotalAmount: updatedBalance,
      date:                new Date().toISOString()
    };

    // i) Return success + receiptData
    return res.status(200).json({
      message: 'Loan payment recorded successfully.',
      receiptData: receiptData
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error recording loan payment:', error);
    return res.status(500).json({
      message: 'Server error while recording loan payment.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


app.get('/loans/unreconciled_dev', async (req, res) => {
  let connection;
  try {
    // Read from query parameters
    const { company_name, branch_name } = req.query;

    // Validate
    if (!company_name || !branch_name) {
      return res.status(400).json({
        message: "Please provide 'company_name' and 'branch_name' as query parameters."
      });
    }

    connection = await connect.getConnection();

    // Query only loans for the specified company and branch
    const query = `
      SELECT *
      FROM loan_paid_dev
      WHERE reconciled = 0
        AND company_name = ?
        AND branch_name = ?
    `;
    const [unreconciledLoans] = await connection.query(query, [
      company_name,
      branch_name
    ]);

    // Calculate the total of amount_paid
    const totalAmountPaid = unreconciledLoans.reduce(
      (sum, row) => sum + parseFloat(row.amount_paid || 0), 
      0
    );

    // Create a totals row and append it
    const totalsRow = {
      id: 'Totals',
      customer_number: null,
      customer_name: 'Total',
      customer_contact: null,
      amount_paid: totalAmountPaid.toFixed(2),
      outstanding_total_amount: null,
      trxn_date: null,
      reconciled: null,
      company_name: company_name,
      branch_name: branch_name,
      user_id: null
    };

    unreconciledLoans.push(totalsRow);

    res.status(200).json(unreconciledLoans);
  } catch (error) {
    console.error('Error fetching unreconciled loans:', error);
    res.status(500).json({
      message: 'Server error while fetching unreconciled loans.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
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



app.post('/loans/reconcile_dev', async (req, res) => {
  const { id } = req.body;  // Expect an array of loan payment IDs to reconcile

  if (!id || !Array.isArray(id) || id.length === 0) {
    return res.status(400).json({ message: 'Invalid or missing IDs.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    const query = `UPDATE loan_paid_dev SET Reconciled = 1 WHERE id IN (?)`;
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



// Example top imports (adjust paths as needed):
// const connect = require('./db');    // or wherever your connect.getConnection() is exported
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
// const { JWT_SECRET } = require('./config'); // or however you store the secret

// Make sure you have the same imports / configuration as your '/login' route.
// e.g.:
// const connect = require('./db');         // or wherever you export connect.getConnection()
// const jwt = require('jsonwebtoken');
// const { JWT_SECRET } = require('./config'); // or however you store your secret


app.post('/save-company-dev', async (req, res) => {
  // Acquire a connection from your pool
  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Destructure the request body
    const {
      the_company_name,
      the_company_branch,
      the_company_box_number,
      company_name,
      branch_name,
      user_id
    } = req.body;

    // 2. Validate the required fields
    if (!company_name || !branch_name || !user_id) {
      await connection.rollback();
      return res.status(400).json({
        message: 'company_name, branch_name, and user_id are required.'
      });
    }

    // 3. Check if record already exists
    const checkQuery = `
      SELECT *
      FROM the_company_datails_dev
      WHERE company_name = ?
        AND branch_name = ?
        AND user_id = ?
      LIMIT 1
    `;
    const [existingRows] = await connection.query(checkQuery, [
      company_name,
      branch_name,
      user_id
    ]);

    let companyRecord;
    if (existingRows.length > 0) {
      // Record already exists
      companyRecord = existingRows[0];
    } else {
      // 4. Insert a new record
      const insertQuery = `
        INSERT INTO the_company_datails_dev (
          the_company_name,
          the_company_branch,
          the_company_box_number,
          created_at,
          update_at,
          company_name,
          branch_name,
          user_id
        )
        VALUES (
          ?, ?, ?, 
          CURRENT_TIMESTAMP, 
          CURRENT_TIMESTAMP, 
          ?, ?, ?
        )
      `;
      const [result] = await connection.query(insertQuery, [
        the_company_name  || 'Edad Coin SMS-Ltd',
        the_company_branch || 'Edad Coin SMS-Ltd',
        the_company_box_number || 'Edad Coin SMS-Ltd',
        company_name,
        branch_name,
        user_id
      ]);

      // 5. Retrieve the newly inserted row
      const [newRows] = await connection.query(
        `SELECT * FROM the_company_datails_dev 
         WHERE the_company_details_id = ?`,
        [result.insertId]
      );
      companyRecord = newRows[0];
    }

    // 6. Commit the transaction
    await connection.commit();

    // 7. Return the record (existing or newly inserted)
    res.status(200).json({
      message: existingRows.length > 0
        ? 'Company record already exists. Returning existing record.'
        : 'New company record inserted successfully.',
      data: companyRecord
    });
  } catch (error) {
    // Roll back on error
    await connection.rollback();
    console.error('Error saving company record:', error);
    res.status(500).json({
      message: 'Server error while saving company record.'
    });
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
});



/**
 * Example of how you might import/require your DB connection module:
 */
// const connect = require('./db'); // <-- Adjust path as needed

/**
 * Helper: Generate a random numeric code of the specified length (digits only).
 */
function generateRandomCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i++) {
    // Math.random() * 10 gives a random number 0–9.99..., floor it to get an integer 0–9
    code += Math.floor(Math.random() * 10);
  }
  return code;
}


/**
 * Helper: Generate a truly unique code by checking the DB for collisions.
 * - connection: an active DB connection
 * - length: length of the random code to generate (defaults to 8)
 */
async function generateUniqueCodeInDB(connection, length = 4) {
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = generateRandomCode(length);

    // Check if this code is already in log_in_dev
    const [rows] = await connection.query(
      'SELECT user_id FROM log_in_dev WHERE unique_user_code = ? LIMIT 1',
      [code]
    );

    if (rows.length === 0) {
      // If no record has this code, it's unique in the DB
      isUnique = true;
    }
  }

  return code;
}

/**
 * Route: /save-login-dev
 * Purpose: Insert or update a user in log_in_dev.
 * - If unique_user_code is missing, automatically generate a truly unique code.
 * - Uses an upsert (INSERT ... ON DUPLICATE KEY UPDATE) based on `unique_combo` index
 *   (username, company_name, branch_name, local_user_id).
 */
app.post('/save-login-dev', async (req, res) => {
  // Get the connection from your existing module (similar to /save-company-dev)
  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Destructure the request body
    const {
      username,
      password_hash, // hashed password or plain text if you're not hashing yet
      company_name,
      branch_name,
      local_user_id,
      title,
      first_name,
      last_name,
      birth_date,
      recruitement_date,
      line_manager,
      former_employment,
      role,
      creation_time,
      unique_user_code // the code from the front-end, if any
    } = req.body;

    // 2. If no code is supplied, generate a truly unique one
    let finalUniqueCode = unique_user_code;
    if (!finalUniqueCode) {
      finalUniqueCode = await generateUniqueCodeInDB(connection, 8);
    }
    console.log('Final Unique Code:', finalUniqueCode);

    // 3. Upsert query: insert or update existing record
    const upsertQuery = `
      INSERT INTO log_in_dev (
        username,
        password_hash,
        company_name,
        branch_name,
        local_user_id,
        title,
        first_name,
        last_name,
        birth_date,
        recruitement_date,
        line_manager,
        former_employment,
        role,
        creation_time,
        unique_user_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        password_hash      = VALUES(password_hash),
        title             = VALUES(title),
        first_name        = VALUES(first_name),
        last_name         = VALUES(last_name),
        birth_date        = VALUES(birth_date),
        recruitement_date = VALUES(recruitement_date),
        line_manager      = VALUES(line_manager),
        former_employment = VALUES(former_employment),
        role              = VALUES(role),
        creation_time     = VALUES(creation_time),
        unique_user_code  = VALUES(unique_user_code)
    `;
    await connection.query(upsertQuery, [
      username,
      password_hash || null,
      company_name,
      branch_name,
      local_user_id,
      title || null,
      first_name || null,
      last_name || null,
      birth_date || null,
      recruitement_date || null,
      line_manager || null,
      former_employment || null,
      role || null,
      creation_time || null,
      finalUniqueCode
    ]);

    // 4. Retrieve the inserted/updated row
    const [rows] = await connection.query(`
      SELECT *
      FROM log_in_dev
      WHERE username      = ?
        AND company_name  = ?
        AND branch_name   = ?
        AND local_user_id = ?
      LIMIT 1
    `, [username, company_name, branch_name, local_user_id]);

    // 5. Commit the transaction
    await connection.commit();

    // 6. Return success + the inserted/updated row
    res.status(200).json({
      message: 'User record inserted/updated successfully.',
      data: rows.length ? rows[0] : {}
    });

  } catch (error) {
    // 7. Roll back on error
    await connection.rollback();
    console.error('Error saving user record:', error);
    res.status(500).json({
      message: 'Server error while saving user record.'
    });

  } finally {
    // 8. Always release the connection
    connection.release();
  }
});




app.post('/login_dev', async (req, res) => {
  const { local_user_id, password, unique_user_code } = req.body;

  // 1) Validate input
  if (!local_user_id || !password || !unique_user_code) {
    return res.status(400).json({
      message: 'local_user_id, password, and unique_user_code are required.'
    });
  }

  // Acquire connection
  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    // 2) Query the user by local_user_id + unique_user_code
    const selectQuery = `
      SELECT *
      FROM log_in_dev
      WHERE local_user_id = ?
        AND unique_user_code = ?
      LIMIT 1
    `;
    const [rows] = await connection.query(selectQuery, [local_user_id, unique_user_code]);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found or invalid unique code.' });
    }
    const user = rows[0];

    // 3) Plaintext password check (not secure for production)
    if (user.password_hash !== password) {
      await connection.rollback();
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 4) Update last_login
    const updateQuery = `
      UPDATE log_in_dev
      SET last_login = NOW()
      WHERE local_user_id = ?
        AND unique_user_code = ?
    `;
    await connection.query(updateQuery, [local_user_id, unique_user_code]);

    // 5) Generate JWT, including title, role, company_name, etc.
    const token = jwt.sign(
      {
        local_user_id: user.local_user_id,
        title: user.title,                // <-- Include title here
        role: user.role,
        company_name: user.company_name,  
        branch_name: user.branch_name     
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await connection.commit();

    // 6) Return response
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        local_user_id: user.local_user_id,
        unique_user_code: user.unique_user_code,
        first_name: user.first_name,
        last_name: user.last_name,
        title: user.title,
        role: user.role,
        company_name: user.company_name,
        branch_name: user.branch_name,
        last_login: user.last_login
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  } finally {
    connection.release();
  }
});

// Start the server

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
