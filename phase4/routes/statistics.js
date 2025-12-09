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

// 3-3. 제조사별 모델 수 TOP 10 (Type 9: Complex Group By/Order By)
router.get('/manufacturer-top10', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT * FROM (
                SELECT Manufacturer, COUNT(Model_ID) as Model_Count
                FROM EFFECTOR_MODEL
                GROUP BY Manufacturer
                ORDER BY Model_Count DESC
            ) WHERE ROWNUM <= 10
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('statistics/result', {
            title: '제조사별 모델 수 TOP 10',
            columns: ['MANUFACTURER', 'MODEL_COUNT'],
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

// 3-4. 유저별 평균 평점 랭킹 (Type 9: Complex Group By/Order By)
router.get('/user-rating-ranking', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT usr.User_name, AVG(br.Rating_Value) as Avg_Received_Rating
            FROM USR usr
            JOIN PEDALBOARD pd ON usr.User_ID = pd.User_ID
            JOIN RATING br ON pd.Pedalboard_ID = br.Pedalboard_ID
            GROUP BY usr.User_name
            ORDER BY Avg_Received_Rating DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('statistics/result', {
            title: '유저별 평균 평점 랭킹',
            columns: ['USER_NAME', 'AVG_RECEIVED_RATING'],
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

// 3-5. 활동 분석(리뷰 썼는지 안썼는지) (Type 10: Set Operation - MINUS)
router.get('/inactive-raters', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT User_name FROM USR
            WHERE User_ID IN (
                SELECT User_ID FROM PEDALBOARD
                MINUS
                SELECT User_ID FROM RATING
            )
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('statistics/result', {
            title: '활동 분석 (보드 생성 O, 평가 X 유저)',
            columns: ['USER_NAME'],
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
