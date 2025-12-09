const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// GET 메뉴
router.get('/', (req, res) => {
    res.render('statistics/index');
});

// 3-1. 유저보드 등록 수 (Type 3: Aggregation + Group By)
router.get('/user-board-count', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT u.User_name, COUNT(p.Pedalboard_ID) as Board_Count
            FROM USR u
            JOIN PEDALBOARD p ON u.User_ID = p.User_ID
            GROUP BY u.User_name
            ORDER BY Board_Count DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('statistics/result', {
            title: '유저별 보드 등록 수',
            columns: ['USER_NAME', 'BOARD_COUNT'],
            data: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// 3-2. 페달보드 평균 평점 (Type 3: Aggregation + Group By)
router.get('/board-avg-rating', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT p.Pedalboard_ID, p.Pedalboard_name, AVG(r.Rating_Value) as Avg_Rating
            FROM PEDALBOARD p
            JOIN RATING r ON p.Pedalboard_ID = r.Pedalboard_ID
            GROUP BY p.Pedalboard_ID, p.Pedalboard_name
            ORDER BY Avg_Rating DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('statistics/result', {
            title: '페달보드 평균 평점',
            columns: ['PEDALBOARD_ID', 'PEDALBOARD_NAME', 'AVG_RATING'],
            data: result.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});
module.exports = router;