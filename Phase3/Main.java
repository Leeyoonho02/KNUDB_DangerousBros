package Phase3;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Scanner;

public class Main {

    private static Scanner scanner = new Scanner(System.in);
    private static UserDAO userDAO = new UserDAO();
    private static PedalboardDAO pedalboardDAO = new PedalboardDAO();
    private static PedalboardExplorer explorer = new PedalboardExplorer();
    private static StatisticsAndRanking statistics = new StatisticsAndRanking();
    private static User loggedInUser = null;

    public static void main(String[] args) {
        while (true) {
            if (loggedInUser == null) {
                showInitialMenu();
            } else {
                showMainMenu();
            }
        }
    }

    private static void showInitialMenu() {
        System.out.println("\n===============================================");
        System.out.println("   🎸 Dangerous Bros 페달보드 시스템 v2.0 🎸");
        System.out.println("===============================================");
        System.out.println("1. 로그인");
        System.out.println("2. 회원가입");
        System.out.println("0. 종료");
        System.out.println("===============================================");
        try {
            System.out.print("메뉴 선택 > ");
            int choice = Integer.parseInt(scanner.nextLine());

            switch (choice) {
                case 1:
                    login();
                    break;
                case 2:
                    register();
                    break;
                case 0:
                    System.out.println("프로그램을 종료합니다.");
                    System.exit(0);
                    break;
                default:
                    System.out.println("잘못된 입력입니다. 다시 선택해주세요.");
            }
        } catch (NumberFormatException e) {
            System.out.println("⚠️ 숫자를 입력해주세요.");
        }
    }

    private static void showMainMenu() {
        System.out.println("\n-----------------------------------------------");
        System.out.printf("   [메인 메뉴] - 안녕하세요, %s님!\n", loggedInUser.getUserName());
        System.out.println("-----------------------------------------------");
        System.out.println("1. [마이페이지] 내 정보 및 보드 관리");
        System.out.println("2. [페달보드 탐색] 다른 유저의 장비 구경");
        System.out.println("3. [통계 및 랭킹] 데이터 분석실");
        System.out.println("4. 로그아웃");
        System.out.println("-----------------------------------------------");
        try {
            System.out.print("메뉴 선택 > ");
            int choice = Integer.parseInt(scanner.nextLine());

            switch (choice) {
                case 1:
                    showMyPageMenu();
                    break;
                case 2:
                    showPedalboardExplorerMenu();
                    break;
                case 3:
                    showStatisticsAndRankingMenu();
                    break;
                case 4:
                    logout();
                    break;
                default:
                    System.out.println("잘못된 입력입니다. 다시 선택해주세요.");
            }
        } catch (NumberFormatException e) {
            System.out.println("⚠️ 숫자를 입력해주세요.");
        }
    }

    private static void showMyPageMenu() {
        System.out.println("\n--- [1. 마이페이지] ---");
        System.out.println("1-1. 내 페달보드 목록 (등록순) (Type 8)");
        System.out.println("1-2. 회원 정보 수정 (UPDATE)");
        System.out.println("1-3. 회원 탈퇴 (DELETE)");
        System.out.println("0. 메인으로 돌아가기");
        System.out.println("--------------------");

        try {
            System.out.print("메뉴 선택 > ");
            String choice = scanner.nextLine().trim();
            switch (choice) {
                case "1-1":
                    showMyPedalboards();
                    break;
                case "1-2":
                    updateUser();
                    break;
                case "1-3":
                    deleteUser();
                    break;
                case "0":
                    System.out.println("메인 메뉴로 돌아갑니다.");
                    break;
                default:
                    System.out.println("잘못된 입력입니다.");
            }
        } catch (Exception e) {
            System.out.println("⚠️ 입력 처리 중 오류가 발생했습니다.");
        }
    }

    private static void showPedalboardExplorerMenu() {
        Connection conn = null;
        try {
            conn = DBManager.getConnection();
            if (conn == null) {
                System.out.println("❌ DB 연결 실패로 기능을 실행할 수 없습니다.");
                return;
            }

            while (true) {
                System.out.println("\n--- [2. 페달보드 탐색] ---");
                System.out.println("2-1. 보드 상세 내용(이펙터 체인) 조회 (Type 2)");
                System.out.println("2-2. 특정 이펙터 포함 보드 검색 (Type 4)");
                System.out.println("2-3. 특정 타입(예: Delay) 이펙터 포함 보드 검색 (Type 5)");
                System.out.println("2-4. 카테고리별 보드 검색 (Type 6)");
                System.out.println("2-5. 평점 4.5 이상 '명예의 전당' 보드 보기 (Type 7)");
                System.out.println("0. 메인으로 돌아가기");
                System.out.println("---------------------------");
                System.out.print("메뉴 선택 > ");

                String choice = scanner.nextLine().trim();

                if (choice.equals("0")) {
                    System.out.println("메인 메뉴로 돌아갑니다.");
                    break;
                }

                switch (choice) {
                    case "2-1":
                        explorer.getPedalboardDetails(conn);
                        break;
                    case "2-2":
                        explorer.searchBoardsByModelName(conn);
                        break;
                    case "2-3":
                        explorer.searchBoardsByEffectorType(conn);
                        break;
                    case "2-4":
                        explorer.searchBoardsByCategory(conn);
                        break;
                    case "2-5":
                        explorer.viewHallOfFameBoards(conn);
                        break;
                    default:
                        System.out.println("⚠️ 잘못된 메뉴 선택입니다. 다시 입력해주세요.");
                }
            }
        } catch (Exception e) {
            System.err.println("❌ 기능 실행 중 오류 발생: " + e.getMessage());
        } finally {
            DBManager.closeConnection(conn);
        }
    }

    private static void login() {
        System.out.println("\n--- [로그인] ---");
        System.out.print("아이디: ");
        String id = scanner.nextLine();
        System.out.print("비밀번호: ");
        String pw = scanner.nextLine();

        User user = userDAO.login(id, pw);
        if (user != null) {
            loggedInUser = user;
            System.out.printf("로그인 성공! %s님 환영합니다.\n", loggedInUser.getUserName());
        } else {
            System.out.println("아이디 또는 비밀번호가 일치하지 않습니다.");
        }
    }

    private static void register() {
        System.out.println("\n--- [회원가입] ---");
        System.out.print("사용할 아이디: ");
        String id = scanner.nextLine();
        System.out.print("사용할 비밀번호: ");
        String pw = scanner.nextLine();
        System.out.print("이름: ");
        String name = scanner.nextLine();
        System.out.print("이메일: ");
        String mail = scanner.nextLine();

        boolean success = userDAO.register(id, pw, name, mail);
        if (success) {
            System.out.println("회원가입이 완료되었습니다! 로그인해주세요.");
        } else {
            System.out.println("회원가입에 실패했습니다. (아이디/이름/이메일 중복 등)");
        }
    }

    private static void logout() {
        loggedInUser = null;
        System.out.println("로그아웃 되었습니다.");
    }

    private static void updateUser() {
        System.out.println("\n--- [회원 정보 수정] ---");
        System.out.print("새 비밀번호: ");
        String newPw = scanner.nextLine();
        System.out.print("새 이름: ");
        String newName = scanner.nextLine();
        System.out.print("새 이메일: ");
        String newMail = scanner.nextLine();

        String finalPw = newPw.isEmpty() ? loggedInUser.getPassword() : newPw;
        String finalName = newName.isEmpty() ? loggedInUser.getUserName() : newName;
        String finalMail = newMail.isEmpty() ? loggedInUser.getEmail() : newMail;

        boolean success = userDAO.updateUser(loggedInUser.getUserId(), finalPw, finalName, finalMail);

        if (success) {
            System.out.println("회원 정보가 성공적으로 수정되었습니다.");
            loggedInUser.setPassword(finalPw);
            loggedInUser.setUserName(finalName);
            loggedInUser.setEmail(finalMail);
        } else {
            System.out.println("회원 정보 수정에 실패했습니다.");
        }
    }

    private static void deleteUser() {
        System.out.println("\n--- [회원 탈퇴] ---");
        System.out.println("회원 탈퇴를 위해 비밀번호를 다시 한번 입력해주세요.");
        System.out.print("비밀번호: ");
        String pw = scanner.nextLine();

        boolean success = userDAO.deleteUser(loggedInUser.getUserId(), pw);

        if (success) {
            System.out.println("회원 탈퇴가 완료되었습니다. 안녕히 가세요.");
            loggedInUser = null;
        } else {
            System.out.println("비밀번호가 일치하지 않아 탈퇴할 수 없습니다.");
        }
    }

    private static void showMyPedalboards() {
        System.out.println("\n--- [내 페달보드 목록 (등록순)] ---");
        List<Pedalboard> boards = pedalboardDAO.getPedalboardsByUserId(loggedInUser.getUserId());

        if (boards.isEmpty()) {
            System.out.println("등록된 페달보드가 없습니다.");
        } else {
            for (Pedalboard board : boards) {
                System.out.println(board.toString());
            }
        }
        System.out.println("---------------------------------");
    }

    private static void showStatisticsAndRankingMenu() {
        Connection conn = null;
        try {
            conn = DBManager.getConnection();
            if (conn == null) {
                System.out.println("❌ DB 연결 실패로 기능을 실행할 수 없습니다.");
                return;
            }

            while (true) {
                System.out.println("\n--- [3. 통계 및 랭킹] ---");
                System.out.println("3-1. 유저별 보드 등록 수 보기 (Type 3)");
                System.out.println("3-2. 개별 페달보드 평균 평점 조회 (Type 3)");
                System.out.println("3-3. 제조사별 모델 수 TOP 10 (Type 9)");
                System.out.println("3-4. 유저별 평균 평점 랭킹 (Type 9)");
                System.out.println("3-5. 활동 분석 (보드 생성 O, 평가 X 유저) (Type 10)");
                System.out.println("0. 메인으로 돌아가기");
                System.out.println("---------------------------");
                System.out.print("메뉴 선택 > ");

                String choice = scanner.nextLine().trim();

                if (choice.equals("0")) {
                    System.out.println("메인 메뉴로 돌아갑니다.");
                    break;
                }

                switch (choice) {
                    case "3-1":
                        statistics.getUserBoardCount(conn);
                        break;
                    case "3-2":
                        statistics.getPedalboardAverageRating(conn);
                        break;
                    case "3-3":
                        statistics.getManufacturerModelCountTop10(conn);
                        break;
                    case "3-4":
                        statistics.getUserAverageRatingRanking(conn);
                        break;
                    case "3-5":
                        statistics.getInactiveRaters(conn);
                        break;
                    default:
                        System.out.println("⚠️ 잘못된 메뉴 선택입니다. 다시 입력해주세요.");
                }
            }
        } catch (Exception e) {
            System.err.println("❌ 기능 실행 중 오류 발생: " + e.getMessage());
        } finally {
            DBManager.closeConnection(conn);
        }
    }
}