-- =================================================================
-- 1. USER 테이블
-- =================================================================
DROP TABLE USR CASCADE CONSTRAINTS;

CREATE TABLE USR (
    User_ID VARCHAR2(50) NOT NULL,
    User_PW VARCHAR2(50) NOT NULL,
    User_name VARCHAR2(100) NOT NULL unique,
    User_mail VARCHAR2(100) NOT NULL unique,
    PRIMARY KEY (User_ID)
);

-- =================================================================
-- 2. PEDALBOARD 테이블
-- =================================================================
DROP TABLE PEDALBOARD CASCADE CONSTRAINTS;

CREATE TABLE PEDALBOARD (
    Pedalboard_ID NUMBER NOT NULL,
    Pedalboard_name VARCHAR2(100) NOT NULL,
    Registeration_date DATE,
    Pedalboard_category VARCHAR2(200),
    User_ID VARCHAR2(50) NOT NULL,
    PRIMARY KEY (Pedalboard_ID),
    FOREIGN KEY (User_ID) REFERENCES USR(User_ID)
);

-- =================================================================
-- 3. EFFECTOR_MODEL 테이블
-- =================================================================
DROP TABLE EFFECTOR_MODEL CASCADE CONSTRAINTS;

CREATE TABLE EFFECTOR_MODEL (
    Model_ID NUMBER NOT NULL,
    Effector_type VARCHAR2(100) NOT NULL,
    Manufacturer VARCHAR2(100),
    Model_name VARCHAR2(100) NOT NULL,
    User_ID VARCHAR2(50) NOT NULL,
    PRIMARY KEY (Model_ID),
    FOREIGN KEY (User_ID) REFERENCES USR(User_ID)
);

-- =================================================================
-- 4. EFFECTOR_PARAMETER 테이블
-- =================================================================
DROP TABLE effector_parameter CASCADE CONSTRAINTS;

CREATE TABLE EFFECTOR_PARAMETER (
    Model_ID NUMBER NOT NULL,
    Description VARCHAR2(255) NOT NULL,
    Parameter_name VARCHAR2(100) NOT NULL,
    PRIMARY KEY (Model_ID, Parameter_name),
    FOREIGN KEY (Model_ID) REFERENCES EFFECTOR_MODEL(Model_ID)
);

-- =================================================================
-- 5. BOARD_ITEM 테이블
-- =================================================================
DROP TABLE board_item CASCADE CONSTRAINTS;

CREATE TABLE BOARD_ITEM (
    Item_ID NUMBER NOT NULL,
    Chain_order NUMBER NOT NULL,
    Pedalboard_ID NUMBER NOT NULL,
    Model_ID NUMBER NOT NULL,
    PRIMARY KEY (Item_ID, Pedalboard_ID, Model_ID),
    FOREIGN KEY (Pedalboard_ID) REFERENCES PEDALBOARD(Pedalboard_ID),
    FOREIGN KEY (Model_ID) REFERENCES EFFECTOR_MODEL(Model_ID)
--  CONSTRAINT uk_board_item UNIQUE (Pedalboard_ID, Model_ID, Item_ID) 
);

-- =================================================================
-- 6. PARAMETER_VALUE 테이블
-- =================================================================
DROP TABLE parameter_value CASCADE CONSTRAINTS;

CREATE TABLE PARAMETER_VALUE (
    Value_ID NUMBER NOT NULL,
    Item_ID NUMBER NOT NULL,
    Pedalboard_ID INT NOT NULL,
    Parameter_name VARCHAR2(100) NOT NULL,
    Model_ID NUMBER NOT NULL,
    Actual_Value VARCHAR2(255) NOT NULL,
    PRIMARY KEY (Value_ID, Item_ID, Model_ID, Pedalboard_ID, Parameter_name),
    FOREIGN KEY (Item_ID, Pedalboard_ID, Model_ID) REFERENCES BOARD_ITEM(Item_ID, Pedalboard_ID, Model_ID),
    FOREIGN KEY (Model_ID, Parameter_name) REFERENCES EFFECTOR_PARAMETER(Model_ID, Parameter_name),
    CONSTRAINT uk_param_value UNIQUE (Item_ID, Parameter_name, Model_ID)
);


-- =================================================================
-- 7. RATING 테이블
-- =================================================================
DROP TABLE rating CASCADE CONSTRAINTS;

CREATE TABLE RATING (
    Rating_ID NUMBER NOT NULL,
    User_ID VARCHAR2(50) NOT NULL,
    Pedalboard_ID NUMBER NOT NULL,
    Rating_Value NUMBER NOT NULL,
    PRIMARY KEY (Rating_ID),
    FOREIGN KEY (User_ID) REFERENCES USR(User_ID),
    FOREIGN KEY (Pedalboard_ID) REFERENCES PEDALBOARD(Pedalboard_ID)
);


