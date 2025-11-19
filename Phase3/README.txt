================================================================================
KNU Database Project Phase 3 - Dangerous Bros (Pedalboard System)
================================================================================

1. 프로젝트 개요
--------------------------------------------------------------------------------
본 프로젝트는 기타 이펙터 페달보드를 관리하고 공유하는 시스템의 Phase 3 구현 결과물입니다.
Java와 Oracle Database를 연동하여 CLI(Command Line Interface) 환경에서 동작하며,
사용자는 페달보드를 등록, 조회, 검색하고 통계 정보를 확인할 수 있습니다.

2. 개발 환경
--------------------------------------------------------------------------------
- Language: Java (JDK 8)
- Database: Oracle Database (XEPDB1)
- JDBC Driver: ojdbc10.jar

3. 파일 구성 (Phase3 패키지)
--------------------------------------------------------------------------------
1) Main.java
   - 프로그램의 진입점(Entry Point)
   - 전체 메뉴 구조(로그인, 메인 메뉴, 서브 메뉴) 및 흐름 제어
   - 사용자 입력 처리

2) DBManager.java
   - Oracle DB 연결 설정 및 Connection 객체 관리
   - JDBC 드라이버 로드 및 연결 해제 유틸리티

3) User.java / UserDAO.java
   - User: 사용자 정보(ID, PW, 이름, 이메일)를 담는 VO(Value Object)
   - UserDAO: 회원가입, 로그인, 정보 수정, 탈퇴 등 사용자 관련 DB 연산 처리

4) Pedalboard.java / PedalboardDAO.java
   - Pedalboard: 페달보드 정보(ID, 이름, 작성자, 등록일)를 담는 VO
   - PedalboardDAO: 사용자의 페달보드 목록 조회 기능 처리

5) PedalboardExplorer.java
   - 페달보드 탐색 관련 심화 기능 구현
   - 상세 조회, 검색(모델명, 타입, 카테고리), 명예의 전당 등

6) StatisticsAndRanking.java
   - 통계 및 랭킹 관련 심화 기능 구현
   - 유저별 등록 수, 평점 분석, 제조사 통계, 활동 분석 등

4. 구현된 기능 및 요구사항 매핑
--------------------------------------------------------------------------------
본 프로그램은 Phase 3의 요구사항인 다양한 SQL 유형을 포함하여 구현되었습니다.

[기본 기능]
- 회원가입 (INSERT)
- 로그인 (Simple SELECT)
- 회원 정보 수정 (UPDATE)
- 회원 탈퇴 (DELETE)

[심화 기능 - PedalboardExplorer]
1) 보드 상세 내용 조회 (Type 2: Join Query)
   - 유저 이름으로 페달보드와 포함된 이펙터, 파라미터 정보를 조인하여 조회
   - Tables: USR, PEDALBOARD, BOARD_ITEM, EFFECTOR_MODEL, PARAMETER_VALUE

2) 특정 이펙터 포함 보드 검색 (Type 4: Subquery)
   - 특정 모델명을 포함하는 페달보드 검색 (IN 절 서브쿼리 활용)

3) 특정 타입 이펙터 포함 보드 검색 (Type 5: Exists)
   - 특정 타입(예: Delay)을 포함하는 보드 검색 (EXISTS 연산자 활용)

4) 카테고리별 보드 검색 (Type 6: Like)
   - 입력된 카테고리 키워드를 포함하는 보드 검색 (LIKE 연산자 활용)

5) 명예의 전당 (Type 7: Inline View)
   - 평균 평점이 4.5 이상인 보드 조회 (FROM 절 서브쿼리 활용)

[통계 및 랭킹]
6) 유저별 보드 등록 수 (Type 3: Aggregation + Group By)
   - 사용자별 등록한 페달보드 개수 집계

7) 페달보드 평균 평점 (Type 3: Aggregation + Group By)
   - 각 페달보드의 평균 평점 계산

8) 내 페달보드 목록 (Type 8: Order By)
   - 로그인한 사용자의 보드를 등록일(Registeration_date) 순으로 정렬

9) 제조사별 모델 수 TOP 10 (Type 9: Complex Group By/Order By)
   - 이펙터 제조사별 모델 수를 집계하여 상위 10개 조회

10) 유저별 평균 평점 랭킹 (Type 9: Complex Group By/Order By)
    - 유저가 받은 평점의 평균을 계산하여 랭킹 산정

11) 활동 분석 (Type 10: Set Operation)
    - 보드는 생성했으나 평가는 하지 않은 유저 조회 (MINUS 연산자 활용)

5. 실행 방법
--------------------------------------------------------------------------------
1) 컴파일
   $ javac -d . *.java

2) 실행
   $ java Phase3.Main

* 주의: 실행 시 CLASSPATH에 Oracle JDBC 드라이버(ojdbc10.jar)가 포함되어 있어야 합니다.
  예) java -cp ".:./ojdbc10.jar" Phase3.Main  (Mac/Linux)
      java -cp ".;./ojdbc10.jar" Phase3.Main  (Windows)
