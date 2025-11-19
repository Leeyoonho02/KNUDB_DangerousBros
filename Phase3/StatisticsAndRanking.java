package Phase3;

import java.sql.*;
import java.util.Scanner;

public class StatisticsAndRanking {
    private Scanner scanner = new Scanner(System.in);

    public void getUserBoardCount(Connection conn) {
        System.out.println("--- 3-1. 유저별 보드 등록 수 보기 ---");

        String sql = "SELECT " +
                "    U.User_name, " +
                "    COUNT(P.Pedalboard_ID) AS NumberOfPedalboards " +
                "FROM " +
                "    USR U, " +
                "    PEDALBOARD P " +
                "WHERE " +
                "    U.User_ID = P.User_ID " +
                "GROUP BY " +
                "    U.User_name " +
                "ORDER BY " +
                "    NumberOfPedalboards DESC";

        try (Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql)) {

            if (!rs.isBeforeFirst()) {
                System.out.println("결과 없음: 등록된 보드가 없습니다.");
                return;
            }

            System.out.println("\n--- 유저별 보드 등록 수 (많은 순서대로) ---");
            System.out.println("----------------------------------------");
            System.out.printf("%-30s | %s\n", "사용자명", "등록 보드 수");
            System.out.println("----------------------------------------");

            while (rs.next()) {
                String userName = rs.getString("User_name");
                int boardCount = rs.getInt("NumberOfPedalboards");
                System.out.printf("%-30s | %d개\n", userName, boardCount);
            }
            System.out.println("----------------------------------------");

        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void getPedalboardAverageRating(Connection conn) {
        System.out.println("--- 3-2. 개별 페달보드 평균 평점 조회 ---");

        String sql = "SELECT " +
                "    P.Pedalboard_name, " +
                "    AVG(R.Rating_Value) AS AverageRating " +
                "FROM " +
                "    PEDALBOARD P, " +
                "    RATING R " +
                "WHERE " +
                "    P.Pedalboard_ID = R.Pedalboard_ID " +
                "GROUP BY " +
                "    P.Pedalboard_name " +
                "ORDER BY " +
                "    AverageRating DESC";

        try (Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql)) {

            if (!rs.isBeforeFirst()) {
                System.out.println("결과 없음: 평점 데이터가 없습니다.");
                return;
            }

            System.out.println("\n--- 페달보드 평균 평점 (높은 순서대로) ---");
            System.out.println("----------------------------------------");
            System.out.printf("%-30s | %s\n", "보드 이름", "평균 평점");
            System.out.println("----------------------------------------");

            while (rs.next()) {
                String boardName = rs.getString("Pedalboard_name");
                double avgRating = rs.getDouble("AverageRating");
                System.out.printf("%-30s | %.2f점\n", boardName, avgRating);
            }
            System.out.println("----------------------------------------");

        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void getManufacturerModelCountTop10(Connection conn) {
        System.out.println("--- 3-3. 제조사별 모델 수 TOP 10 ---");

        String sql = "SELECT * " +
                "FROM ( " +
                "    SELECT " +
                "        Manufacturer, " +
                "        COUNT(Model_ID) AS ModelCount " +
                "    FROM " +
                "        EFFECTOR_MODEL " +
                "    GROUP BY " +
                "        Manufacturer " +
                "    ORDER BY " +
                "        ModelCount DESC " +
                ") " +
                "WHERE ROWNUM <= 10";

        try (Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql)) {

            if (!rs.isBeforeFirst()) {
                System.out.println("결과 없음: 제조사 데이터가 없습니다.");
                return;
            }

            System.out.println("\n--- 제조사별 모델 수 TOP 10 ---");
            System.out.println("----------------------------------------");
            System.out.printf("%-5s | %-30s | %s\n", "순위", "제조사", "모델 수");
            System.out.println("----------------------------------------");

            int rank = 1;
            while (rs.next()) {
                String manufacturer = rs.getString("Manufacturer");
                int modelCount = rs.getInt("ModelCount");
                System.out.printf("%-5d | %-30s | %d개\n", rank++, manufacturer, modelCount);
            }
            System.out.println("----------------------------------------");

        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void getUserAverageRatingRanking(Connection conn) {
        System.out.println("--- 3-4. 유저별 평균 평점 랭킹 ---");

        String sql = "SELECT " +
                "    U.User_name, " +
                "    AVG(R.Rating_Value) AS AvgRatingReceived " +
                "FROM " +
                "    USR U, " +
                "    PEDALBOARD P, " +
                "    RATING R " +
                "WHERE " +
                "    U.User_ID = P.User_ID " +
                "    AND P.Pedalboard_ID = R.Pedalboard_ID " +
                "GROUP BY " +
                "    U.User_name " +
                "ORDER BY " +
                "    AvgRatingReceived DESC";

        try (Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql)) {

            if (!rs.isBeforeFirst()) {
                System.out.println("결과 없음: 평점 데이터가 없습니다.");
                return;
            }

            System.out.println("\n--- 유저별 평균 평점 랭킹 (높은 순서대로) ---");
            System.out.println("----------------------------------------");
            System.out.printf("%-5s | %-30s | %s\n", "순위", "사용자명", "평균 평점");
            System.out.println("----------------------------------------");

            int rank = 1;
            while (rs.next()) {
                String userName = rs.getString("User_name");
                double avgRating = rs.getDouble("AvgRatingReceived");
                System.out.printf("%-5d | %-30s | %.2f점\n", rank++, userName, avgRating);
            }
            System.out.println("----------------------------------------");

        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void getInactiveRaters(Connection conn) {
        System.out.println("--- 3-5. 활동 분석 (보드 생성 O, 평가 X 유저) ---");

        String sql = "SELECT U.User_name " +
                "FROM USR U " +
                "WHERE U.User_ID IN (SELECT P.User_ID FROM PEDALBOARD P) " +
                "MINUS " +
                "SELECT U.User_name " +
                "FROM USR U " +
                "WHERE U.User_ID IN (SELECT R.User_ID FROM RATING R)";

        try (Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql)) {

            if (!rs.isBeforeFirst()) {
                System.out.println("결과 없음: 해당하는 유저가 없습니다.");
                return;
            }

            System.out.println("\n--- 보드 생성 O, 평가 X 유저 (활동 분석) ---");
            System.out.println("----------------------------------------");
            System.out.printf("%-30s\n", "사용자명");
            System.out.println("----------------------------------------");

            int count = 0;
            while (rs.next()) {
                count++;
                String userName = rs.getString("User_name");
                System.out.printf("%-30s\n", userName);
            }
            System.out.println("----------------------------------------");
            System.out.println("총 " + count + "명");

        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }
}
