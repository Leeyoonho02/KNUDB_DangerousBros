package Phase3;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class PedalboardDAO {

    // (Type 8) 특정 유저의 페달보드 목록을 등록순으로 조회
    public List<Pedalboard> getPedalboardsByUserId(String userId) {
        // 컬럼명과 정렬 기준을 스키마 및 요구사항에 맞게 수정
        // Registeration_date (등록순) ASC 정렬은 Type 8 요구사항을 충족합니다.
        String sql = "SELECT * FROM PEDALBOARD WHERE User_ID = ? ORDER BY Registeration_date ASC";
        List<Pedalboard> pedalboards = new ArrayList<>();

        try (Connection conn = DBManager.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Pedalboard board = new Pedalboard(
                        // ✨ 컬럼명을 실제 스키마 이름에 맞게 수정
                        rs.getInt("Pedalboard_ID"),
                        rs.getString("Pedalboard_name"),
                        rs.getString("User_ID"),
                        rs.getDate("Registeration_date") 
                    );
                    pedalboards.add(board);
                }
            }
        } catch (SQLException e) {
            System.out.println("데이터베이스 오류: " + e.getMessage());
        }
        return pedalboards;
    }
}