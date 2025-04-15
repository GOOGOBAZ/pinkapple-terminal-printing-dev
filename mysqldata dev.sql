
DROP PROCEDURE IF EXISTS agingAnalysisSimple;

DELIMITER ##

CREATE PROCEDURE agingAnalysisSimple()
BEGIN
    DECLARE l_done INT;
    DECLARE TrnId INT;
    DECLARE LoanId VARCHAR(20);
    DECLARE customerName VARCHAR(60);
    DECLARE customerContactNumber VARCHAR(60);
    DECLARE theLoanStatus VARCHAR(20);
    DECLARE gaurantorName1 VARCHAR(100);
    DECLARE gaurantorContact1 VARCHAR(100);
    DECLARE gaurantorName2 VARCHAR(100);
    DECLARE gaurantorContact2 VARCHAR(100);
    DECLARE remainport DOUBLE;
    DECLARE princeremain DOUBLE;
    DECLARE interestRem DOUBLE;
    DECLARE p_remain,loanTaken,totalRem,amount_arrears,P,I DOUBLE;
    DECLARE i_remain DOUBLE;
    DECLARE arrears INT;
    DECLARE TrnDate DATE;

    -- Cursor for loan IDs with status 'Disbursed' or 'Renewed'
    DECLARE forSelectingLoanIds CURSOR FOR
        SELECT DISTINCT trn_id
        FROM new_loan_appstore
        WHERE loan_cycle_status IN ('Disbursed', 'Renewed');
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET l_done = 1;

    -- Temporary table for aging analysis
    DROP TABLE IF EXISTS aging_loan_analysis;
    CREATE TEMPORARY TABLE aging_loan_analysis (
        id INT NOT NULL AUTO_INCREMENT,
        trn_id INT,
        loan_id VARCHAR(20),
        customer_name VARCHAR(60),
        customer_contact VARCHAR(60),
        gaurantor1_name VARCHAR(100),
        gaurantor1_contact VARCHAR(100),
        gaurantor2_name VARCHAR(100),
        gaurantor2_contact VARCHAR(100),
        date_taken DATE,
        due_date DATE,
        loan_taken DOUBLE,
        principal_remaining DOUBLE,
        interest_remaining DOUBLE,
        total_remaining DOUBLE,
        total_inarrears DOUBLE,
        number_of_days_in_arrears INT,
        loan_status VARCHAR(20),
        PRIMARY KEY (id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;

    -- Open cursor and start loop
    OPEN forSelectingLoanIds;
    accounts_loop: LOOP
        FETCH forSelectingLoanIds INTO TrnId;
        IF l_done THEN
            LEAVE accounts_loop;
        END IF;

        -- Reset variables for each loan
        SET customerName = NULL, customerContactNumber = NULL, theLoanStatus = NULL;
        SET gaurantorName1 = NULL, gaurantorContact1 = NULL, gaurantorName2 = NULL, gaurantorContact2 = NULL;
        SET remainport = 0, princeremain = 0, interestRem = 0, p_remain = 0, i_remain = 0, arrears = 0;

        -- Fetch main loan details
        SELECT pl.loan_id, applicant_account_name, m.mobile1, pl.trn_date,
               pl.princimpal_amount, pl.TotalPrincipalRemaining, pl.TotalInterestRemaining,
              pl.balance_due, pl.loan_cycle_status
        INTO LoanId, customerName, customerContactNumber, TrnDate, loanTaken,
             princeremain, interestRem, totalRem, theLoanStatus
        FROM pmms.master m
        INNER JOIN pmms_loans.new_loan_appstore pl ON pl.applicant_account_number = m.account_number
        WHERE pl.trn_id = TrnId;

        -- Calculate remaining amounts and arrears
        SELECT SUM(PrincipalRemaining) ,SUM(InterestRemaing),(SUM(PrincipalRemaining) + SUM(InterestRemaing)), numberOfDayInArrears(LoanId)
        INTO P,I, amount_arrears, arrears
        FROM new_loan_appstoreamort
        WHERE master1_id = TrnId AND instalment_due_date <= DATE(NOW()) AND NOT instalment_status = 'P';
/* SELECT P,I,  amount_arrears; */
        -- Fetch guarantors
        SELECT gaurantorsName, gaurantorsContact1 INTO gaurantorName1, gaurantorContact1
        FROM gaurantors
        WHERE loanTrnId = LoanId
        ORDER BY id ASC
        LIMIT 1;

        SELECT gaurantorsName, gaurantorsContact1 INTO gaurantorName2, gaurantorContact2
        FROM gaurantors
        WHERE loanTrnId = LoanId
        ORDER BY id DESC
        LIMIT 1;

        -- Insert data into consolidated table
        INSERT INTO aging_loan_analysis (
            trn_id,loan_id, customer_name, customer_contact, gaurantor1_name, gaurantor1_contact, 
            gaurantor2_name, gaurantor2_contact, date_taken, due_date, loan_taken, 
            principal_remaining, interest_remaining,total_remaining,total_inarrears,number_of_days_in_arrears, loan_status
        )
        VALUES (
            TrnId,LoanId, customerName, customerContactNumber, gaurantorName1, gaurantorContact1,
            gaurantorName2, gaurantorContact2, TrnDate, DATE_ADD(TrnDate, INTERVAL 30 DAY),
            loanTaken, princeremain, interestRem, totalRem, amount_arrears, arrears, theLoanStatus
        );

        SET l_done = 0;
    END LOOP;

    CLOSE forSelectingLoanIds;

    -- Select data categorized by aging period
    SELECT * FROM aging_loan_analysis ORDER BY loan_status, number_of_days_in_arrears;

END ##


DELIMITER ;


 CREATE TABLE `loan_paid` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_number` varchar(100) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_contact` varchar(20) DEFAULT NULL,
  `amount_paid` decimal(15,2) DEFAULT NULL,
  `outstanding_total_amount` decimal(15,2) DEFAULT NULL,
  `trxn_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reconciled` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_customer_number` (`customer_number`),
  KEY `idx_trxn_date` (`trxn_date`),
  KEY `idx_reconciled` (`reconciled`)
) ENGINE=InnoDB AUTO_INCREMENT=1892 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

START TRANSACTION;

ALTER TABLE `loan_paid`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `reconciled`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `user_id` INT NOT NULL AFTER `branch_name`;

COMMIT;

START TRANSACTION;

ALTER TABLE `loan_paid`
  ADD UNIQUE KEY `idx_unique_customer_company_branch` (`customer_number`, `company_name`, `branch_name`);

COMMIT;

CREATE TABLE `loan_portfolio_dev` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_id` varchar(20) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_contact` varchar(20) DEFAULT NULL,
  `guarantor1_name` varchar(100) DEFAULT NULL,
  `guarantor1_contact` varchar(20) DEFAULT NULL,
  `guarantor2_name` varchar(100) DEFAULT NULL,
  `guarantor2_contact` varchar(20) DEFAULT NULL,
  `date_taken` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `loan_taken` decimal(15,2) DEFAULT NULL,
  `principal_remaining` decimal(15,2) DEFAULT NULL,
  `interest_remaining` decimal(15,2) DEFAULT NULL,
  `total_remaining` decimal(15,2) DEFAULT NULL,
  `total_inarrears` decimal(15,2) DEFAULT NULL,
  `number_of_days_in_arrears` int DEFAULT NULL,
  `loan_status` varchar(20) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_unique_loan_company_branch` (`loan_id`,`company_name`,`branch_name`),
   KEY `idx_loan_id` (`loan_id`),
  KEY `idx_loan_status` (`loan_status`),
  KEY `idx_due_date` (`due_date`)
) ENGINE=InnoDB AUTO_INCREMENT=8989 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



CREATE TABLE `log_in` (
  `trn_date` date DEFAULT NULL,
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `p_word_login` varchar(30) NOT NULL,
  `account_number` varchar(30) DEFAULT NULL,
  `account_name` varchar(30) DEFAULT NULL,
  `title` varchar(45) DEFAULT NULL,
  `first_name` varchar(60) DEFAULT NULL,
  `last_name` varchar(60) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `recruitement_date` date DEFAULT NULL,
  `line_manager` varchar(60) DEFAULT NULL,
  `former_employment` varchar(60) DEFAULT NULL,
  `role` varchar(30) DEFAULT NULL,
  `creation_time` time DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_id_UNIQUE` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10004 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_0900_ai_ci;

START TRANSACTION;

ALTER TABLE `log_in`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `role`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `app_user_id` INT NOT NULL AFTER `branch_name`;

-- Optional: If you want a unique key for (existing user_id, company_name, branch_name)
--   This might be redundant since user_id itself is already unique.
-- ALTER TABLE `log_in`
--   ADD UNIQUE KEY `idx_unique_user_company_branch` (`user_id`, `company_name`, `branch_name`);

COMMIT;

CREATE TABLE `savings_history_dev` (
  `id` int NOT NULL AUTO_INCREMENT,
  `TrnId` varchar(50) DEFAULT NULL,
  `TrnDate` datetime DEFAULT NULL,
  `AccountNumber` varchar(50) DEFAULT NULL,
  `AccountName` varchar(100) DEFAULT NULL,
  `SavingsPaid` decimal(15,2) DEFAULT NULL,
  `SavingsRunningBalance` decimal(15,2) DEFAULT NULL,
  `RECONCILED` tinyint(1) DEFAULT '0',
  `company_name` varchar(255) DEFAULT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_TrnId` (`TrnId`),
  KEY `idx_AccountNumber` (`AccountNumber`),
  KEY `idx_TrnDate` (`TrnDate`),
  KEY `idx_RECONCILED` (`RECONCILED`)
) ENGINE=InnoDB AUTO_INCREMENT=4663 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `savings_paid` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `transaction_date` date NOT NULL,
  `account_number` varchar(20) NOT NULL,
  `account_name` varchar(100) DEFAULT NULL,
  `savings_paid` decimal(15,2) DEFAULT '0.00',
  `savings_running_balance` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_account_number` (`account_number`),
  KEY `idx_transaction_date` (`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

START TRANSACTION;

ALTER TABLE `savings_paid`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `created_at`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `user_id` INT NOT NULL AFTER `branch_name`;

-- Optional: Unique constraint
ALTER TABLE `savings_paid`
  ADD UNIQUE KEY `idx_unique_trans_company_branch` (`transaction_id`, `company_name`, `branch_name`);

COMMIT;


CREATE TABLE `transactions` (
  `TrnId` int NOT NULL AUTO_INCREMENT,
  `TrnDate` date NOT NULL,
  `AccountNumber` varchar(20) NOT NULL,
  `AccountName` varchar(100) DEFAULT NULL COMMENT 'Name of the account holder',
  `SavingsMonth` varchar(20) NOT NULL COMMENT 'Month of the transaction (e.g., January)',
  `SavingsYear` year NOT NULL COMMENT 'Year of the transaction',
  `SavingsAdded` decimal(15,2) DEFAULT '0.00' COMMENT 'Amount added to savings',
  `SavingsRemoved` decimal(15,2) DEFAULT '0.00' COMMENT 'Amount removed from savings',
  `SavingsRunningBalance` decimal(15,2) DEFAULT '0.00' COMMENT 'Running balance of savings',
  `OtherOne` varchar(255) DEFAULT NULL COMMENT 'Additional information 1',
  `OtherTwo` varchar(255) DEFAULT NULL COMMENT 'Additional information 2',
  `OtherThree` varchar(255) DEFAULT NULL COMMENT 'Additional information 3',
  `OtherFour` varchar(255) DEFAULT NULL COMMENT 'Additional information 4',
  `OtherFive` varchar(255) DEFAULT NULL COMMENT 'Additional information 5',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  PRIMARY KEY (`TrnId`),
  UNIQUE KEY `idx_account_month_year` (`AccountNumber`,`SavingsMonth`,`SavingsYear`),
  KEY `idx_account_number` (`AccountNumber`),
  KEY `idx_transaction_date` (`TrnId`)
) ENGINE=InnoDB AUTO_INCREMENT=29924 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

START TRANSACTION;

ALTER TABLE `transactions`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `OtherFive`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `user_id` INT NOT NULL AFTER `branch_name`;

-- Optional: unique combo with existing columns plus the new ones:
-- This ensures (AccountNumber, SavingsMonth, SavingsYear, company_name, branch_name) is unique.
ALTER TABLE `transactions`
  ADD UNIQUE KEY `idx_acct_month_year_company_branch` 
      (`AccountNumber`, `SavingsMonth`, `SavingsYear`, `company_name`, `branch_name`);

COMMIT;







 CREATE TABLE `loan_paid_dev` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_number` varchar(100) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_contact` varchar(20) DEFAULT NULL,
  `amount_paid` decimal(15,2) DEFAULT NULL,
  `outstanding_total_amount` decimal(15,2) DEFAULT NULL,
  `trxn_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reconciled` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_customer_number` (`customer_number`),
  KEY `idx_trxn_date` (`trxn_date`),
  KEY `idx_reconciled` (`reconciled`)
) ENGINE=InnoDB AUTO_INCREMENT=1892 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

START TRANSACTION;

ALTER TABLE `loan_paid_dev`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `reconciled`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `user_id` INT NOT NULL AFTER `branch_name`;

COMMIT;

START TRANSACTION;

ALTER TABLE `loan_paid_dev`
  ADD UNIQUE KEY `idx_unique_customer_company_branch` (`customer_number`, `company_name`, `branch_name`);

COMMIT;


CREATE TABLE `loan_portfolio_dev` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_id` varchar(20) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_contact` varchar(20) DEFAULT NULL,
  `guarantor1_name` varchar(100) DEFAULT NULL,
  `guarantor1_contact` varchar(20) DEFAULT NULL,
  `guarantor2_name` varchar(100) DEFAULT NULL,
  `guarantor2_contact` varchar(20) DEFAULT NULL,
  `date_taken` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `loan_taken` decimal(15,2) DEFAULT NULL,
  `principal_remaining` decimal(15,2) DEFAULT NULL,
  `interest_remaining` decimal(15,2) DEFAULT NULL,
  `total_remaining` decimal(15,2) DEFAULT NULL,
  `total_inarrears` decimal(15,2) DEFAULT NULL,
  `number_of_days_in_arrears` int DEFAULT NULL,
  `loan_status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `loan_id` (`loan_id`),
  KEY `idx_loan_status` (`loan_status`),
  KEY `idx_due_date` (`due_date`)
) ENGINE=InnoDB AUTO_INCREMENT=8989 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


START TRANSACTION;

ALTER TABLE `loan_portfolio_dev`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `loan_status`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `user_id` INT NOT NULL AFTER `branch_name`;

-- Optional: Make (loan_id, company_name, branch_name) unique
ALTER TABLE `loan_portfolio_dev`
  ADD UNIQUE KEY `idx_unique_loan_company_branch` (`loan_id`, `company_name`, `branch_name`);

COMMIT;



CREATE TABLE `log_in_dev` (
  `trn_date` date DEFAULT NULL,
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `p_word_login` varchar(30) NOT NULL,
  `account_number` varchar(30) DEFAULT NULL,
  `account_name` varchar(30) DEFAULT NULL,
  `title` varchar(45) DEFAULT NULL,
  `first_name` varchar(60) DEFAULT NULL,
  `last_name` varchar(60) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `recruitement_date` date DEFAULT NULL,
  `line_manager` varchar(60) DEFAULT NULL,
  `former_employment` varchar(60) DEFAULT NULL,
  `role` varchar(30) DEFAULT NULL,
  `creation_time` time DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_id_UNIQUE` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10004 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_0900_ai_ci;

START TRANSACTION;

ALTER TABLE `log_in_dev`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `role`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `app_user_id` INT NOT NULL AFTER `branch_name`;

-- Optional: If you want a unique key for (existing user_id, company_name, branch_name)
--   This might be redundant since user_id itself is already unique.
-- ALTER TABLE `log_in`
--   ADD UNIQUE KEY `idx_unique_user_company_branch` (`user_id`, `company_name`, `branch_name`);

COMMIT;



CREATE TABLE `savings_history_dev` (
  `id` int NOT NULL AUTO_INCREMENT,
  `TrnId` varchar(50) DEFAULT NULL,
  `TrnDate` datetime DEFAULT NULL,
  `AccountNumber` varchar(50) DEFAULT NULL,
  `AccountName` varchar(100) DEFAULT NULL,
  `SavingsPaid` decimal(15,2) DEFAULT NULL,
  `SavingsRunningBalance` decimal(15,2) DEFAULT NULL,
  `RECONCILED` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_TrnId` (`TrnId`),
  KEY `idx_AccountNumber` (`AccountNumber`),
  KEY `idx_TrnDate` (`TrnDate`),
  KEY `idx_RECONCILED` (`RECONCILED`)
) ENGINE=InnoDB AUTO_INCREMENT=4661 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


START TRANSACTION;

ALTER TABLE `savings_history_dev`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `RECONCILED`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `user_id` INT NOT NULL AFTER `branch_name`;

-- Optional: Unique constraint
-- Be sure there aren’t duplicates of (TrnId, company_name, branch_name).
ALTER TABLE `savings_history_dev`
  ADD UNIQUE KEY `idx_unique_trnid_company_branch` (`TrnId`, `company_name`, `branch_name`);

COMMIT;


CREATE TABLE `savings_paid_dev` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `transaction_date` date NOT NULL,
  `account_number` varchar(20) NOT NULL,
  `account_name` varchar(100) DEFAULT NULL,
  `savings_paid` decimal(15,2) DEFAULT '0.00',
  `savings_running_balance` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_account_number` (`account_number`),
  KEY `idx_transaction_date` (`transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

START TRANSACTION;

ALTER TABLE `savings_paid_dev`
  ADD COLUMN `company_name` VARCHAR(255) DEFAULT NULL AFTER `created_at`,
  ADD COLUMN `branch_name` VARCHAR(255) DEFAULT NULL AFTER `company_name`,
  ADD COLUMN `user_id` INT NOT NULL AFTER `branch_name`;

-- Optional: Unique constraint
ALTER TABLE `savings_paid_dev`
  ADD UNIQUE KEY `idx_unique_trans_company_branch` (`transaction_id`, `company_name`, `branch_name`);

COMMIT;



CREATE TABLE `transactions_dev` (
  `TrnId` int NOT NULL AUTO_INCREMENT,
  `TrnDate` date NOT NULL,
  `AccountNumber` varchar(20) NOT NULL,
  `AccountName` varchar(100) DEFAULT NULL COMMENT 'Name of the account holder',
  `SavingsMonth` varchar(20) NOT NULL COMMENT 'Month of the transaction (e.g., January)',
  `SavingsYear` year NOT NULL COMMENT 'Year of the transaction',
  `SavingsAdded` decimal(15,2) DEFAULT '0.00' COMMENT 'Amount added to savings',
  `SavingsRemoved` decimal(15,2) DEFAULT '0.00' COMMENT 'Amount removed from savings',
  `SavingsRunningBalance` decimal(15,2) DEFAULT '0.00' COMMENT 'Running balance of savings',
  `OtherOne` varchar(255) DEFAULT NULL COMMENT 'Additional information 1',
  `OtherTwo` varchar(255) DEFAULT NULL COMMENT 'Additional information 2',
  `OtherThree` varchar(255) DEFAULT NULL COMMENT 'Additional information 3',
  `OtherFour` varchar(255) DEFAULT NULL COMMENT 'Additional information 4',
  `OtherFive` varchar(255) DEFAULT NULL COMMENT 'Additional information 5',
  `company_name` varchar(255) DEFAULT NULL,
  `branch_name` varchar(255) DEFAULT NULL,
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  PRIMARY KEY (`TrnId`),
  UNIQUE KEY `idx_acct_month_year_company_branch` (`AccountNumber`,`company_name`,`branch_name`),
  KEY `idx_account_number` (`AccountNumber`),
  KEY `idx_transaction_date` (`TrnId`)
) ENGINE=InnoDB AUTO_INCREMENT=29927 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- git config --global user.name "GOOGOBAZ"
-- git config --global user.email "augbazi@gmail.com"

START TRANSACTION;

CREATE TABLE `the_company_datails_dev` (
  `the_company_details_id` int NOT NULL AUTO_INCREMENT,
  `the_company_name` varchar(100) DEFAULT 'Edad Coin SMS-Ltd',
  `the_company_branch` varchar(100) DEFAULT 'Edad Coin SMS-Ltd',
  `the_company_box_number` varchar(100) DEFAULT 'Edad Coin SMS-Ltd',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `update_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`the_company_details_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;




ALTER TABLE `the_company_datails_dev`

  ADD COLUMN `company_name`    VARCHAR(100) NOT NULL AFTER `update_at`,
  ADD COLUMN `branch_name`     VARCHAR(100) NOT NULL AFTER `company_name`,
  ADD COLUMN `user_id`         INT NOT NULL AFTER `branch_name`,

  -- 2) Create a composite unique key on (customer_number, company_name, branch_name)
  ADD UNIQUE KEY `uk_customer_company_branch` (
    `company_name`, 
    `branch_name`
  );

COMMIT;





SELECT 
    AccountNumber,
    AccountName,
    COUNT(*) AS duplicate_count
FROM transactions
GROUP BY AccountNumber, AccountName
HAVING COUNT(*) > 1;



CREATE TABLE `log_in_dev` (
  `user_id`              BIGINT NOT NULL AUTO_INCREMENT,
  `username`             VARCHAR(60) NOT NULL,
  `password_hash`        VARCHAR(255) NOT NULL,
  -- Optional: store a refresh token if you're using "Refresh Token" flows
  `refresh_token`        VARCHAR(255) DEFAULT NULL,
  `refresh_expires_at`   DATETIME DEFAULT NULL,
  
  -- Keep your existing columns if they’re relevant, renamed or re-purposed as needed:
  `account_number`       VARCHAR(30)  DEFAULT NULL,
  `account_name`         VARCHAR(30)  DEFAULT NULL,
  `title`                VARCHAR(45)  DEFAULT NULL,
  `first_name`           VARCHAR(60)  DEFAULT NULL,
  `last_name`            VARCHAR(60)  DEFAULT NULL,
  `birth_date`           DATE         DEFAULT NULL,
  `recruitement_date`    DATE         DEFAULT NULL,
  `line_manager`         VARCHAR(60)  DEFAULT NULL,
  `former_employment`    VARCHAR(60)  DEFAULT NULL,
  `role`                 VARCHAR(30)  DEFAULT NULL,
  
  -- Time when user record is created (set default to auto-generate)
  `creation_time`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Timestamps to track login or JWT usage
  `last_login`           DATETIME     DEFAULT NULL,
  `last_token_issued_at` DATETIME     DEFAULT NULL,
  
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username_UNIQUE` (`username`)
) 
ENGINE=InnoDB
AUTO_INCREMENT=10004
DEFAULT CHARSET=utf8mb3;
