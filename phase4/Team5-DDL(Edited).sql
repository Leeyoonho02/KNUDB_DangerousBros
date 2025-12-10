-- 전반적인 데이터 타입 변경: 대부분의 VARCHAR 타입이 VARCHAR2로, INT 타입이 NUMBER로 변경되었습니다.
-- PEDALBOARD - 날짜 타입 변경: PEDALBOARD 테이블의 Registeration_date 컬럼이 INT에서 DATE 타입으로 변경되었습니다.
-- PARAMETER_VALUE - 외래 키 수정 (1): PARAMETER_VALUE의 복합 외래 키 참조 대상이 BOARD_ITEM(Item_ID, Pedalboard_ID)에서 BOARD_ITEM(Item_ID, Pedalboard_ID, Model_ID)로 수정되었습니다.
-- BOARD_ITEM - 제약 조건 제거: BOARD_ITEM 테이블에 있던 uk_board_item UNIQUE 제약 조건이 제거되었습니다.
-- PARAMETER_VALUE - UNIQUE 제약 조건 추가: PARAMETER_VALUE 테이블에 uk_param_value UNIQUE (Item_ID, Parameter_name, Model_ID) 제약 조건이 새로 추가되었습니다.
-- PARAMETER_VALUE - 외래 키 수정 (2): PARAMETER_VALUE의 외래 키가 EFFECTOR_PARAMETER(Model_ID, Parameter_name)을 참조하도록 명시되었습니다.
-- RATING - 데이터 타입 변경: RATING 테이블의 Rating_ID와 Rating_Value 컬럼 타입이 INT에서 NUMBER로 변경되었습니다.

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


