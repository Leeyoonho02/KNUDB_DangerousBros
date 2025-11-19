package Phase3;

//DBManager.java
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBManager {
 // ⚠️ 여기에 윤호님 Oracle DB 정보 입력!
public static final String URL = "jdbc:oracle:thin:@localhost:1521/XEPDB1"; 
public static final String USER ="YHLEE"; 
public static final String PW ="0718";

 public static Connection getConnection() {
     Connection conn = null;
     try {
         // Oracle JDBC 드라이버 로드
         Class.forName("oracle.jdbc.driver.OracleDriver");
         conn = DriverManager.getConnection(URL, USER, PW);
     } catch (ClassNotFoundException | SQLException e) {
         System.out.println("DB 연결 오류: " + e.getMessage());
         e.printStackTrace();
     }
     return conn;
 }
 public static void closeConnection(Connection conn) {
        if (conn != null) {
            try {
                conn.close();
            } catch (SQLException e) {
                System.err.println("DB 연결 종료 중 오류 발생: " + e.getMessage());
            }
        }
    }
}