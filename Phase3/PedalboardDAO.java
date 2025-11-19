package Phase3;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class PedalboardDAO {

    public List<Pedalboard> getPedalboardsByUserId(String userId) {
        String sql = "SELECT * FROM PEDALBOARD WHERE User_ID = ? ORDER BY Registeration_date ASC";
        List<Pedalboard> pedalboards = new ArrayList<>();

        try (Connection conn = DBManager.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Pedalboard board = new Pedalboard(
                            rs.getInt("Pedalboard_ID"),
                            rs.getString("Pedalboard_name"),
                            rs.getString("User_ID"),
                            rs.getDate("Registeration_date"));
                    pedalboards.add(board);
                }
            }
        } catch (SQLException e) {
            System.out.println("데이터베이스 오류: " + e.getMessage());
        }
        return pedalboards;
    }
}