const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// 로그인 체크
const requireLogin = (req, res, next) => {
    console.log('Checking login. Session user:', req.session.user);
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

// GET 페달보드 찾기 메뉴
router.get('/', (req, res) => {
    res.render('explorer/index');
});


// GET 페달보드 상세보기 (Type 2: Join Query)
router.get('/board/:id', async (req, res) => {
    const boardId = req.params.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // Get 페달보드
        const boardSql = `
            SELECT p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, u.User_ID, u.User_name 
            FROM PEDALBOARD p 
            JOIN USR u ON p.User_ID = u.User_ID 
            WHERE p.Pedalboard_ID = :boardId
        `;
        const boardResult = await connection.execute(boardSql, [boardId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (boardResult.rows.length === 0) {
            return res.render('explorer/detail', { board: null, items: [], models: [], user: req.session.user }); // Pass user even if board is null
        }

        // Get 모델 (Join Query)
        const itemsSql = `
            SELECT bi.Item_ID, bi.Chain_order, em.Model_name, em.Effector_type, pv.Parameter_name, pv.Actual_Value, em.Model_ID
            FROM BOARD_ITEM bi
            JOIN EFFECTOR_MODEL em ON bi.Model_ID = em.Model_ID
            LEFT JOIN PARAMETER_VALUE pv ON bi.Item_ID = pv.Item_ID AND bi.Pedalboard_ID = pv.Pedalboard_ID
            WHERE bi.Pedalboard_ID = :boardId
            ORDER BY bi.Chain_order ASC
        `;
        const itemsResult = await connection.execute(itemsSql, [boardId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 모델 파라미터 그룹화
        const itemsMap = new Map();
        itemsResult.rows.forEach(row => {
            if (!itemsMap.has(row.ITEM_ID)) {
                itemsMap.set(row.ITEM_ID, {
                    ITEM_ID: row.ITEM_ID,
                    PEDALBOARD_ID: row.PEDALBOARD_ID,
                    MODEL_ID: row.MODEL_ID,
                    CHAIN_ORDER: row.CHAIN_ORDER,
                    MODEL_NAME: row.MODEL_NAME,
                    EFFECTOR_TYPE: row.EFFECTOR_TYPE,
                    PARAMETERS: []
                });
            }
            if (row.PARAMETER_NAME) {
                itemsMap.get(row.ITEM_ID).PARAMETERS.push({
                    PARAMETER_NAME: row.PARAMETER_NAME,
                    ACTUAL_VALUE: row.ACTUAL_VALUE
                });
            }
        });
        const groupedItems = Array.from(itemsMap.values()).sort((a, b) => a.CHAIN_ORDER - b.CHAIN_ORDER);

        // Get 이펙터 모델들 종류
        const modelsResult = await connection.execute(`SELECT Model_ID, Model_name, Manufacturer FROM EFFECTOR_MODEL ORDER BY Model_name ASC`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // Get 평점
        const avgRatingSql = `SELECT AVG(Rating_Value) AS AVG_RATING FROM RATING WHERE Pedalboard_ID = :boardId`;
        const avgRatingResult = await connection.execute(avgRatingSql, { boardId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const avgRating = avgRatingResult.rows[0].AVG_RATING || 0; // 평점 0점 기본(없을 시)

        // Get 내가 준 평점
        let myRating = null;
        if (req.session.user) {
            const myRatingSql = `SELECT Rating_Value FROM RATING WHERE Pedalboard_ID = :boardId AND User_ID = :userId`;
            const myRatingResult = await connection.execute(myRatingSql, { boardId, userId: req.session.user.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            myRating = myRatingResult.rows[0] ? myRatingResult.rows[0].RATING_VALUE : null;
        }

        //뒤로가기 처리(여러 곳에서 호출 가능하므로 세션에 저장)
        const referrer = req.headers.referer;
        if (referrer && !referrer.includes(`/explorer/board/${boardId}`)) {
            if (referrer.includes('/mypage/boards') ||
                referrer.includes('/explorer/search/') ||
                referrer.includes('/statistics/') |
                referrer === `${req.protocol}://${req.get('host')}/explorer`) {
                req.session.explorerReturnPath = referrer;
            } else if (!req.session.explorerReturnPath) {
                req.session.explorerReturnPath = '/explorer'; //기본
            }
        } else if (!req.session.explorerReturnPath) {
            req.session.explorerReturnPath = '/explorer'; //기본
        }


        res.render('explorer/detail', {
            user: req.session.user,
            board: boardResult.rows[0],
            items: groupedItems,
            models: modelsResult.rows,
            avgRating: avgRating,
            myRating: myRating,
            explorerReturnPath: req.session.explorerReturnPath
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// GET 보드 내 모델 파라미터 관리
router.get('/board/:boardId/item/:itemId', requireLogin, async (req, res) => {
    const { boardId, itemId } = req.params;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 기본 정보 및 소유자 확인
        const itemSql = `
            SELECT bi.Item_ID, bi.Pedalboard_ID, bi.Model_ID, bi.Chain_order,
                   em.Model_name, em.Effector_type,
                   pb.User_ID AS BoardOwner_ID
            FROM BOARD_ITEM bi
            JOIN EFFECTOR_MODEL em ON bi.Model_ID = em.Model_ID
            JOIN PEDALBOARD pb ON bi.Pedalboard_ID = pb.Pedalboard_ID
            WHERE bi.Pedalboard_ID = :boardId AND bi.Item_ID = :itemId
        `;
        const itemResult = await connection.execute(itemSql, { boardId, itemId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (itemResult.rows.length === 0 || itemResult.rows[0].BOARDOWNER_ID !== userId) {
            return res.send('<script>alert("이펙터 아이템을 찾을 수 없거나 접근 권한이 없습니다."); window.location.href="/explorer/board/'+boardId+'";</script>');
        }
        const item = itemResult.rows[0];

        // 2. 가능한 파라미터 종류 가져오기
        const allParamsSql = `SELECT Parameter_name, Description FROM EFFECTOR_PARAMETER WHERE Model_ID = :modelId ORDER BY Parameter_name`;
        const allParamsResult = await connection.execute(allParamsSql, { modelId: item.MODEL_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 3. 파라미터 별 값
        const actualValuesSql = `SELECT Parameter_name, Actual_Value FROM PARAMETER_VALUE WHERE Item_ID = :itemId AND Pedalboard_ID = :boardId`;
        const actualValuesResult = await connection.execute(actualValuesSql, { itemId, boardId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const currentParams = {};
        actualValuesResult.rows.forEach(pv => {
            currentParams[pv.PARAMETER_NAME] = pv.ACTUAL_VALUE;
        });
        
        res.render('explorer/item-manage-params', {
            item: item,
            allParams: allParamsResult.rows,
            currentParams: currentParams,
            boardId: boardId
        });

    } catch (err) {
        console.error("Error fetching item parameters:", err);
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// POST 보드 내 모델 삭제
router.post('/item/:itemId/delete', requireLogin, async (req, res) => {
    const { itemId } = req.params;
    const { boardId } = req.body;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 현재 소유자 확인 및 chain 위치 파악
        const getItemInfoSql = `
            SELECT bi.Chain_order, pb.User_ID AS BoardOwner_ID
            FROM BOARD_ITEM bi
            JOIN PEDALBOARD pb ON bi.Pedalboard_ID = pb.Pedalboard_ID
            WHERE bi.Pedalboard_ID = :boardId AND bi.Item_ID = :itemId
        `;
        const itemInfoResult = await connection.execute(getItemInfoSql, { boardId, itemId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (itemInfoResult.rows.length === 0 || itemInfoResult.rows[0].BOARDOWNER_ID !== userId) {
            return res.status(403).send("권한이 없거나 이펙터 아이템을 찾을 수 없습니다.");
        }
        const deletedItemOrder = itemInfoResult.rows[0].CHAIN_ORDER;

        // 2. 삭제
        await connection.execute(`DELETE FROM PARAMETER_VALUE WHERE Item_ID = :id`, { id: itemId });
        await connection.execute(`DELETE FROM BOARD_ITEM WHERE Item_ID = :id`, { id: itemId });

        // 3. 체인 오더 재조정
        const updateChainOrderSql = `
            UPDATE BOARD_ITEM
            SET Chain_order = Chain_order - 1
            WHERE Pedalboard_ID = :pedalboardId AND Chain_order > :deletedItemOrder
        `;
        await connection.execute(updateChainOrderSql, {
            pedalboardId: boardId,
            deletedItemOrder: deletedItemOrder
        });

        await connection.commit();

        res.redirect(`/explorer/board/${boardId}`);
    } catch (err) {
        console.error("Error deleting item from board:", err);
        if (connection) {
            await connection.rollback();
        }
        res.status(500).send("Server Error while deleting item.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// POST 보드 내 모델 추가
router.post('/board/:id/add-item', requireLogin, async (req, res) => {
    const pedalboardId = req.params.id;
    const { model, order } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 같은 모델 있나 체크
        const duplicateCheckSql = `SELECT COUNT(*) AS COUNT FROM BOARD_ITEM WHERE Pedalboard_ID = :pedalboardId AND Model_ID = :modelId`;
        const duplicateCheckResult = await connection.execute(duplicateCheckSql, { pedalboardId, modelId: model }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (duplicateCheckResult.rows[0].COUNT > 0) {
            await connection.rollback(); // Rollback any potential previous operations
            return res.send('<script>alert("이미 해당 모델이 페달보드에 추가되어 있습니다."); window.location.href="/explorer/board/'+pedalboardId+'";</script>');
        }

                // 현재 보드 최대 chain order 조회
                const maxOrderResult = await connection.execute(`SELECT NVL(MAX(Chain_order), 0) AS MAX_ORDER FROM BOARD_ITEM WHERE Pedalboard_ID = :pedalboardId`, { pedalboardId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
                const maxOrder = maxOrderResult.rows[0].MAX_ORDER;
        
                // 입력된 order를 정수로 변환하고 새 규칙에 따라 adjustedOrder 계산
                let adjustedOrder = parseInt(order, 10);
        
                // Rule 1: 1보다 작으면 1로 자동 설정
                if (adjustedOrder < 1) {
                    adjustedOrder = 1;
                }
                // Rule 2: (maxOrder + 1)보다 크면 (maxOrder + 1)로 자동 설정
                if (adjustedOrder > maxOrder + 1) {
                    adjustedOrder = maxOrder + 1;
                }
        
                // 기존 아이템들의 Chain_order를 뒤로 밀어서 새 아이템이 들어갈 공간 확보
                const updateSql = `
                    UPDATE BOARD_ITEM
                    SET Chain_order = Chain_order + 1
                    WHERE Pedalboard_ID = :pedalboardId AND Chain_order >= :adjustedOrder
                `;
                await connection.execute(updateSql, {
                    pedalboardId: pedalboardId,
                    adjustedOrder: adjustedOrder // 조정된 Chain_order 사용
                });
        
                const insertSql = `
                    INSERT INTO BOARD_ITEM (Item_ID, Pedalboard_ID, Model_ID, Chain_order)
                    VALUES (board_item_seq.NEXTVAL, :pedalboardId, :modelId, :adjustedOrder)
                `;
        
                await connection.execute(insertSql, {
                    pedalboardId: pedalboardId,
                    modelId: model,
                    adjustedOrder: adjustedOrder // 조정된 Chain_order 사용
                });        
        await connection.commit();

        res.redirect(`/explorer/board/${pedalboardId}`);

    } catch (err) {
        console.error("Error adding item to board:", err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).send("Server Error while adding item to board.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// POST 페달보드 삭제
router.post('/board/:id/delete', requireLogin, async (req, res) => {
    const pedalboardId = req.params.id;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 소유자 확인
        const ownerCheckSql = `SELECT User_ID FROM PEDALBOARD WHERE Pedalboard_ID = :pedalboardId`;
        const ownerResult = await connection.execute(ownerCheckSql, [pedalboardId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (ownerResult.rows.length === 0 || ownerResult.rows[0].USER_ID !== userId) {
            return res.status(403).send("권한이 없습니다.");
        }

        // 2. 관련 데이터 삭제
        await connection.execute(`DELETE FROM RATING WHERE Pedalboard_ID = :id`, [pedalboardId]);
        await connection.execute(`DELETE FROM PARAMETER_VALUE WHERE Pedalboard_ID = :id`, [pedalboardId]);
        await connection.execute(`DELETE FROM BOARD_ITEM WHERE Pedalboard_ID = :id`, [pedalboardId]);
        
        // 3. 페달보드 삭제
        await connection.execute(`DELETE FROM PEDALBOARD WHERE Pedalboard_ID = :id`, [pedalboardId]);

        // 4. 커밋
        await connection.commit();

        res.redirect('/mypage/boards');

    } catch (err) {
        console.error("Error deleting board:", err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).send("Server Error while deleting board.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// POST 모델 파라미터 저장
router.post('/board/:boardId/item/:itemId/save-params', requireLogin, async (req, res) => {
    const { boardId, itemId } = req.params;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 소유자 확인
        const ownerCheckSql = `
            SELECT pb.User_ID, bi.Model_ID
            FROM BOARD_ITEM bi
            JOIN PEDALBOARD pb ON bi.Pedalboard_ID = pb.Pedalboard_ID
            WHERE bi.Pedalboard_ID = :boardId AND bi.Item_ID = :itemId
        `;
        const ownerResult = await connection.execute(ownerCheckSql, { boardId, itemId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (ownerResult.rows.length === 0 || ownerResult.rows[0].USER_ID !== userId) {
            return res.status(403).send("권한이 없거나 이펙터 아이템을 찾을 수 없습니다.");
        }
        const modelId = ownerResult.rows[0].MODEL_ID;

        // 2. 파라미터 저장
        for (const key in req.body) {
            if (key.startsWith('param_')) {
                const paramName = key.replace('param_', '');
                const actualValue = req.body[key].trim();

                // 해당 파라미터가 모델에 있는 건지 확인
                const paramDefCheckSql = `SELECT 1 FROM EFFECTOR_PARAMETER WHERE Model_ID = :modelId AND Parameter_name = :paramName`;
                const paramDefCheckResult = await connection.execute(paramDefCheckSql, { modelId, paramName });

                if (paramDefCheckResult.rows.length === 0) {
                    continue;
                }

                if (actualValue) {
                    // 업데이트 또는 삽입
                    const updateSql = `
                        UPDATE PARAMETER_VALUE
                        SET Actual_Value = :actualValue
                        WHERE Item_ID = :itemId AND Pedalboard_ID = :boardId AND Parameter_name = :paramName AND Model_ID = :modelId
                    `;
                    const updateResult = await connection.execute(updateSql, { actualValue, itemId, boardId, paramName, modelId }, { autoCommit: false });

                    if (updateResult.rowsAffected === 0) {
                        // 업데이트 없으면 insert
                        const insertSql = `
                            INSERT INTO PARAMETER_VALUE (Value_ID, Item_ID, Pedalboard_ID, Parameter_name, Model_ID, Actual_Value)
                            VALUES (parameter_value_seq.NEXTVAL, :itemId, :boardId, :paramName, :modelId, :actualValue)
                        `;
                        await connection.execute(insertSql, { itemId, boardId, paramName, modelId, actualValue }, { autoCommit: false });
                    }
                } else {
                    // 값이 비어있으면 삭제
                    const deleteSql = `
                        DELETE FROM PARAMETER_VALUE
                        WHERE Item_ID = :itemId AND Pedalboard_ID = :boardId AND Parameter_name = :paramName AND Model_ID = :modelId
                    `;
                    await connection.execute(deleteSql, { itemId, boardId, paramName, modelId }, { autoCommit: false });
                }
            }
        }
        
        await connection.commit();
        res.redirect(`/explorer/board/${boardId}/item/${itemId}`);

    } catch (err) {
        console.error("Error saving parameters:", err);
        if (connection) await connection.rollback();
        res.status(500).send("Server Error while saving parameters.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// POST 페달보드 평점 추가
router.post('/board/:id/rate', requireLogin, async (req, res) => {
    const boardId = req.params.id;
    const userId = req.session.user.id;
    const { rating } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 0. 소유자 확인
        const boardOwnerSql = `SELECT User_ID FROM PEDALBOARD WHERE Pedalboard_ID = :boardId`;
        const boardOwnerResult = await connection.execute(boardOwnerSql, { boardId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const boardOwnerId = boardOwnerResult.rows[0].USER_ID;

        if (boardOwnerId === userId) {
            return res.send('<script>alert("본인의 페달보드는 평가할 수 없습니다."); window.location.href="/explorer/board/'+boardId+'";</script>');
        }

        // 1. 평가 중복 확인
        const existingRatingSql = `SELECT COUNT(*) AS COUNT FROM RATING WHERE Pedalboard_ID = :boardId AND User_ID = :userId`;
        const existingRatingResult = await connection.execute(existingRatingSql, { boardId, userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (existingRatingResult.rows[0].COUNT > 0) {
            // 평가 했다면?
            return res.send('<script>alert("이미 평가했습니다. 기존 평가를 수정하려면 관리자에게 문의하세요."); window.location.href="/explorer/board/'+boardId+'";</script>');
        }

        // 2. rating 삽입
        const insertRatingSql = `
            INSERT INTO RATING (Rating_ID, Pedalboard_ID, User_ID, Rating_Value)
            VALUES (rating_seq.NEXTVAL, :boardId, :userId, :ratingValue)
        `;
        await connection.execute(insertRatingSql, {
            boardId: boardId,
            userId: userId,
            ratingValue: rating
        });

        await connection.commit();

        res.redirect(`/explorer/board/${boardId}`);

    } catch (err) {
        console.error("Error adding rating:", err);
        if (connection) await connection.rollback();
        res.status(500).send("Server Error while adding rating.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// Type 4: Search by Model Name (Subquery)
router.get('/search/model', async (req, res) => {
    const modelName = req.query.modelName;
    let connection;

    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, u.User_name, NVL(AVG(r.Rating_Value), 0) AS AVG_RATING
            FROM PEDALBOARD p
            JOIN USR u ON p.User_ID = u.User_ID
            LEFT JOIN RATING r ON p.Pedalboard_ID = r.Pedalboard_ID
            WHERE p.Pedalboard_ID IN (
                SELECT bi.Pedalboard_ID
                FROM BOARD_ITEM bi
                JOIN EFFECTOR_MODEL em ON bi.Model_ID = em.Model_ID
                WHERE em.Model_name LIKE '%' || :modelName || '%'
            )
            GROUP BY p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, u.User_name
        `;
        const result = await connection.execute(sql, [modelName], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        

        res.render('explorer/list', {
            title: `'${modelName}' 포함 검색 결과`,
            boards: result.rows
        });
    } catch (err) {
        console.error(err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Type 5: Search by Effector Type (Exists)
router.get('/search/type', async (req, res) => {
    const typeName = req.query.typeName;
    let connection;

    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, u.User_name, NVL(AVG(r.Rating_Value), 0) AS AVG_RATING
            FROM PEDALBOARD p
            JOIN USR u ON p.User_ID = u.User_ID
            LEFT JOIN RATING r ON p.Pedalboard_ID = r.Pedalboard_ID
            WHERE EXISTS (
                SELECT 1
                FROM BOARD_ITEM bi
                JOIN EFFECTOR_MODEL em ON bi.Model_ID = em.Model_ID
                WHERE bi.Pedalboard_ID = p.Pedalboard_ID
                AND em.Effector_type LIKE '%' || :typeName || '%'
            )
            GROUP BY p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, u.User_name
        `;
        const result = await connection.execute(sql, [typeName], { outFormat: oracledb.OUT_FORMAT_OBJECT });


        res.render('explorer/list', {
            title: `'${typeName}' 타입 포함 검색 결과`,
            boards: result.rows
        });
    } catch (err) {
        console.error(err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Type 6: Search by Category (Like)
router.get('/search/category', async (req, res) => {
    const inputCategories = req.query.category; // "Rock, Blues"
    let connection;

    try {
        connection = await oracledb.getConnection();

        const categories = inputCategories.split(/\s*,\s*/).filter(c => c.trim() !== '');

        if (categories.length === 0) {
            return res.render('explorer/list', {
                title: '카테고리 검색 결과 (입력 없음)',
                boards: []
            });
        }

        const bindValues = {};
        const whereConditions = [];
        for (let i = 0; i < categories.length; i++) {
            const bindName = `cat${i}`;
            whereConditions.push(`P.Pedalboard_category LIKE :${bindName}`);
            bindValues[bindName] = `%${categories[i]}%`;
        }

        const sql = `
            SELECT p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, p.Pedalboard_category, u.User_name, NVL(AVG(r.Rating_Value), 0) AS AVG_RATING
            FROM PEDALBOARD p
            JOIN USR u ON p.User_ID = u.User_ID
            LEFT JOIN RATING r ON p.Pedalboard_ID = r.Pedalboard_ID
            WHERE ${whereConditions.join(' OR ')}
            GROUP BY p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, p.Pedalboard_category, u.User_name
            ORDER BY p.Registeration_date DESC
        `;

        const result = await connection.execute(sql, bindValues, { outFormat: oracledb.OUT_FORMAT_OBJECT });


        res.render('explorer/list', {
            title: `'${inputCategories}' 카테고리 검색 결과`,
            boards: result.rows
        });
    } catch (err) {
        console.error(err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close(); 
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Type 7: Hall of Fame (Inline View)
router.get('/hall-of-fame', async (req, res) => {
    let connection;

    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT p.Pedalboard_ID, p.Pedalboard_name, p.Registeration_date, u.User_name, avg_rating
            FROM PEDALBOARD p
            JOIN USR u ON p.User_ID = u.User_ID
            JOIN (
                SELECT Pedalboard_ID, AVG(Rating_Value) as avg_rating
                FROM RATING
                GROUP BY Pedalboard_ID
                HAVING AVG(Rating_Value) >= 4.5
            ) r ON p.Pedalboard_ID = r.Pedalboard_ID
            ORDER BY avg_rating DESC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });


        res.render('explorer/list', {
            title: '🏆 명예의 전당 (평점 4.5 이상)',
            boards: result.rows
        });
    } catch (err) {
        console.error(err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

module.exports = router;
