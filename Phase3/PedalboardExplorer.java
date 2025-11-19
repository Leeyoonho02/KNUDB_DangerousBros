package Phase3;

import java.sql.*;
import java.util.Scanner;

public class PedalboardExplorer {
    private Scanner scanner = new Scanner(System.in);

    public void getPedalboardDetails(Connection conn) {
        System.out.println("--- 2-1. 보드 상세 내용(이펙터 체인) 조회 ---");
        System.out.print("조회할 사용자 이름을 입력하세요: ");
        String userName = scanner.nextLine().trim();

        String sql = "SELECT " +
                "    P.Pedalboard_name, " +
                "    BI.Chain_order, " +
                "    EM.Effector_type, " +
                "    EM.Manufacturer, " +
                "    EM.Model_name, " +
                "    PV.Parameter_name, " +
                "    PV.Actual_Value " +
                "FROM " +
                "    USR U, " +
                "    PEDALBOARD P, " +
                "    BOARD_ITEM BI, " +
                "    EFFECTOR_MODEL EM, " +
                "    PARAMETER_VALUE PV " +
                "WHERE " +
                "    U.User_ID = P.User_ID " +
                "    AND P.Pedalboard_ID = BI.Pedalboard_ID " +
                "    AND BI.Model_ID = EM.Model_ID " +
                "    AND BI.Item_ID = PV.Item_ID " +
                "    AND U.User_name = ? " +
                "ORDER BY " +
                "    P.Pedalboard_name ASC, " +
                "    BI.Chain_order ASC";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, userName);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (!rs.isBeforeFirst()) {
                    System.out.println("결과 없음: 사용자 '" + userName + "'의 페달보드가 없습니다.");
                    return;
                }

                String currentBoardName = null;
                int currentChainOrder = -1;

                while (rs.next()) {
                    String boardName = rs.getString("Pedalboard_name");
                    int chainOrder = rs.getInt("Chain_order");
                    String effectorType = rs.getString("Effector_type");
                    String manufacturer = rs.getString("Manufacturer");
                    String modelName = rs.getString("Model_name");
                    String paramName = rs.getString("Parameter_name");
                    String actualValue = rs.getString("Actual_Value");

                    if (!boardName.equals(currentBoardName)) {
                        System.out.println("\n----------------------------------------------------");
                        System.out.println("보드 이름: " + boardName);
                        System.out.println("----------------------------------------------------");
                        currentBoardName = boardName;
                        currentChainOrder = -1;
                    }

                    if (chainOrder != currentChainOrder) {
                        System.out.printf("\n[#%d] %s - %s (%s)\n",
                                chainOrder, manufacturer, modelName, effectorType);
                        currentChainOrder = chainOrder;
                    }

                    System.out.printf("  > %-20s: %s\n", paramName, actualValue);
                }
            }
        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void searchBoardsByModelName(Connection conn) {
        System.out.println("--- 2-2. 특정 이펙터 포함 보드 검색 ---");
        System.out.print("검색할 이펙터 모델 이름을 입력하세요: ");
        String modelName = scanner.nextLine().trim();

        String sql = "SELECT Pedalboard_name " +
                "FROM PEDALBOARD " +
                "WHERE Pedalboard_ID IN ( " +
                "    SELECT Pedalboard_ID FROM BOARD_ITEM " +
                "    WHERE Model_ID = ( " +
                "        SELECT Model_ID FROM EFFECTOR_MODEL " +
                "        WHERE Model_name = ? " +
                "    ) " +
                ")";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, modelName);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (!rs.isBeforeFirst()) {
                    System.out.println("결과 없음: 모델 이름 '" + modelName + "'을 포함하는 페달보드가 없습니다.");
                    return;
                }

                System.out.println("\n--- '" + modelName + "'을(를) 포함하는 페달보드 목록 ---");
                int count = 0;
                while (rs.next()) {
                    count++;
                    System.out.println(count + ". " + rs.getString("Pedalboard_name"));
                }
            }
        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void searchBoardsByEffectorType(Connection conn) {
        System.out.println("--- 2-3. 특정 타입 이펙터 포함 보드 검색 ---");
        System.out.print("검색할 이펙터 타입(예: Delay, Fuzz)을 입력하세요: ");
        String effectorType = scanner.nextLine().trim();

        String sql = "SELECT P.Pedalboard_name " +
                "FROM PEDALBOARD P " +
                "WHERE EXISTS ( " +
                "    SELECT 1 " +
                "    FROM BOARD_ITEM BI, EFFECTOR_MODEL EM " +
                "    WHERE " +
                "        P.Pedalboard_ID = BI.Pedalboard_ID " +
                "        AND BI.Model_ID = EM.Model_ID " +
                "        AND EM.Effector_type = ? " +
                ")";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, effectorType);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (!rs.isBeforeFirst()) {
                    System.out.println("결과 없음: 타입 '" + effectorType + "'을(를) 포함하는 페달보드가 없습니다.");
                    return;
                }

                System.out.println("\n--- '" + effectorType + "' 타입의 이펙터가 포함된 페달보드 목록 ---");
                int count = 0;
                while (rs.next()) {
                    count++;
                    System.out.println(count + ". " + rs.getString("Pedalboard_name"));
                }
            }
        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void searchBoardsByCategory(Connection conn) {
        System.out.println("--- 2-4. 카테고리별 보드 검색 ---");
        System.out.println("검색할 카테고리(들)을 쉼표(,)로 구분하여 입력하세요 (예: Rock, Blues): ");
        String input = scanner.nextLine().trim();
        String[] categories = input.split("\\s*,\\s*");

        if (categories.length == 0 || (categories.length == 1 && categories[0].isEmpty())) {
            System.out.println("⚠️ 검색할 카테고리를 입력해주세요.");
            return;
        }

        StringBuilder whereClause = new StringBuilder();
        whereClause.append("WHERE ");
        for (int i = 0; i < categories.length; i++) {
            if (i > 0) {
                whereClause.append(" OR ");
            }
            whereClause.append("P.Pedalboard_category LIKE ?");
        }

        String sql = "SELECT " +
                "    P.Pedalboard_name, " +
                "    P.Pedalboard_category, " +
                "    P.Registeration_date " +
                "FROM " +
                "    PEDALBOARD P " +
                whereClause.toString() +
                " ORDER BY P.Registeration_date DESC";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (int i = 0; i < categories.length; i++) {
                pstmt.setString(i + 1, "%" + categories[i] + "%");
            }

            try (ResultSet rs = pstmt.executeQuery()) {
                if (!rs.isBeforeFirst()) {
                    System.out.println("결과 없음: 해당 카테고리를 포함하는 페달보드가 없습니다.");
                    return;
                }

                System.out.println("\n--- 카테고리 검색 결과 (최신 등록순) ---");
                while (rs.next()) {
                    String name = rs.getString("Pedalboard_name");
                    String category = rs.getString("Pedalboard_category");
                    Date regDate = rs.getDate("Registeration_date");
                    System.out.printf("[%s] %s: %s\n", regDate, name, category);
                }
            }
        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }

    public void viewHallOfFameBoards(Connection conn) {
        System.out.println("--- 2-5. 평점 4.5 이상 '명예의 전당' 보드 보기 ---");

        String sql = "SELECT " +
                "    P.Pedalboard_name, " +
                "    A.AverageRating " +
                "FROM " +
                "    PEDALBOARD P, " +
                "    (SELECT Pedalboard_ID, AVG(Rating_Value) AS AverageRating " +
                "     FROM RATING " +
                "     GROUP BY Pedalboard_ID) A " +
                "WHERE " +
                "    P.Pedalboard_ID = A.Pedalboard_ID " +
                "    AND A.AverageRating >= 4.5 " +
                "ORDER BY " +
                "    A.AverageRating DESC";

        try (Statement stmt = conn.createStatement();
                ResultSet rs = stmt.executeQuery(sql)) {

            if (!rs.isBeforeFirst()) {
                System.out.println("결과 없음: 현재 평균 평점 4.5점 이상인 페달보드가 없습니다.");
                return;
            }

            System.out.println("\n--- ⭐ 명예의 전당 (평점 4.5 이상) ⭐ ---");
            System.out.println("----------------------------------------");
            System.out.printf("%-30s | %s\n", "보드 이름", "평균 평점");
            System.out.println("----------------------------------------");

            while (rs.next()) {
                String name = rs.getString("Pedalboard_name");
                double avgRating = rs.getDouble("AverageRating");
                System.out.printf("%-30s | %.2f\n", name, avgRating);
            }
            System.out.println("----------------------------------------");

        } catch (SQLException e) {
            System.err.println("SQL 오류 발생: " + e.getMessage());
        }
    }
}