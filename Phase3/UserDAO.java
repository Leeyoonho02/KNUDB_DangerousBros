package Phase3;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class UserDAO {

    public User login(String userId, String password) {
        String sql = "SELECT * FROM USR WHERE User_ID = ? AND User_PW = ?";
        User user = null;

        try (Connection conn = DBManager.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            pstmt.setString(2, password);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    user = new User(
                            rs.getString("User_ID"),
                            rs.getString("User_PW"),
                            rs.getString("User_name"),
                            rs.getString("User_mail"));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return user;
    }

    public boolean register(String id, String pw, String name, String mail) {
        String sql = "INSERT INTO USR (User_ID, User_PW, User_name, User_mail) VALUES (?, ?, ?, ?)";

        try (Connection conn = DBManager.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, id);
            pstmt.setString(2, pw);
            pstmt.setString(3, name);
            pstmt.setString(4, mail);

            int affectedRows = pstmt.executeUpdate();
            return affectedRows > 0;

        } catch (SQLException e) {
            System.out.println("데이터베이스 오류: " + e.getMessage());
            return false;
        }
    }

    public boolean updateUser(String userId, String newPw, String newName, String newMail) {
        String sql = "UPDATE USR SET User_PW = ?, User_name = ?, User_mail = ? WHERE User_ID = ?";

        try (Connection conn = DBManager.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, newPw);
            pstmt.setString(2, newName);
            pstmt.setString(3, newMail);
            pstmt.setString(4, userId);

            int affectedRows = pstmt.executeUpdate();
            return affectedRows > 0;

        } catch (SQLException e) {
            System.out.println("데이터베이스 오류: " + e.getMessage());
            return false;
        }
    }

    public boolean deleteUser(String userId, String password) {
        String sql = "DELETE FROM USR WHERE User_ID = ? AND User_PW = ?";

        try (Connection conn = DBManager.getConnection();
                PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, userId);
            pstmt.setString(2, password);

            int affectedRows = pstmt.executeUpdate();
            return affectedRows > 0;

        } catch (SQLException e) {
            System.out.println("데이터베이스 오류: " + e.getMessage());
            return false;
        }
    }
}