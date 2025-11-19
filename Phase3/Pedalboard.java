package Phase3;

import java.sql.Date;

public class Pedalboard {
    private int boardId;
    private String boardName;
    private String userId;
    private Date registrationDate;

    public Pedalboard(int boardId, String boardName, String userId, Date registrationDate) {
        this.boardId = boardId;
        this.boardName = boardName;
        this.userId = userId;
        this.registrationDate = registrationDate;
    }

    public int getBoardId() { return boardId; }
    public String getBoardName() { return boardName; }
    public String getUserId() { return userId; }
    public Date getRegistrationDate() { return registrationDate; }

    @Override
    public String toString() {
        return String.format("  [%d] %s (등록일: %s)", boardId, boardName, registrationDate.toString());
    }
}