package Phase3;

public class User {
    // 1. 필드 (멤버 변수) 
    private String userId;
    private String password;
    private String userName;
    private String email;

    // 2. 생성자
    public User(String userId, String password, String userName, String email) {
        this.userId = userId;
        this.password = password;
        this.userName = userName;
        this.email = email;
    }

    // 3. Getter 메소드들 
    public String getUserId() {
        return userId;
    }

    public String getPassword() {
        return password;
    }

    public String getUserName() {
        return userName;
    }

    public String getEmail() {
        return email;
    }

    // 4. Setter 메소드들
    
    public void setPassword(String password) {
        this.password = password;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public void setEmail(String email) {
        this.email = email;
    }
    
    // (선택) 출력 편의를 위한 toString() 재정의
    @Override
    public String toString() {
        return "User [ID=" + userId + ", Name=" + userName + ", Email=" + email + "]";
    }
}