document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');
    const totalPlayersInput = document.getElementById('totalPlayers');

    const tierRateBoundariesDiv = document.getElementById('tierRateBoundaries'); // Tier境界レート入力用div

    const winRateVsMuchHigherInput = document.getElementById('winRateVsMuchHigher');
    const winRateVsSlightlyHigherInput = document.getElementById('winRateVsSlightlyHigher');
    const winRateVsEqualInput = document.getElementById('winRateVsEqual');
    const winRateVsSlightlyLowerInput = document.getElementById('winRateVsSlightlyLower');
    const winRateVsMuchLowerInput = document.getElementById('winRateVsMuchLower');

    const calculateButton = document.getElementById('calculateButton');

    // --- 出力表示要素 ---
    const totalMatchesDisplay = document.getElementById('totalMatchesDisplay');
    const currentWinRateDisplay = document.getElementById('currentWinRate');
    const expectedRate100MatchesDisplay = document.getElementById('expectedRate100Matches');
    const neededWinsForTargetDisplay = document.getElementById('neededWinsForTarget');

    // 詳細レート変動量テーブル要素
    const gainMuchHigherCalculated = document.getElementById('gainMuchHigherCalculated');
    const lossMuchHigherCalculated = document.getElementById('lossMuchHigherCalculated');
    const gainSlightlyHigherCalculated = document.getElementById('gainSlightlyHigherCalculated');
    const lossSlightlyHigherCalculated = document.getElementById('lossSlightlyHigherCalculated');
    const gainEqualCalculated = document.getElementById('gainEqualCalculated');
    const lossEqualCalculated = document.getElementById('lossEqualCalculated');
    const gainSlightlyLowerCalculated = document.getElementById('gainSlightlyLowerCalculated');
    const lossSlightallyLowerCalculated = document.getElementById('lossSlightlyLowerCalculated');
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    // Tierレート推定テーブル要素
    const tierRateTableBody = document.querySelector('#tierRateTable tbody');


    // --- 定数と初期データ ---
    const rateDiffCoefficient = 0.04; // 公式ヘルプより固定値

    // デバッグ・テスト用の初期値
    winsInput.value = 100;
    lossesInput.value = 70;
    currentRateInput.value = 2059;
    totalPlayersInput.value = 250;
    winRateVsMuchHigherInput.value = 30;
    winRateVsSlightlyHigherInput.value = 50;
    winRateVsEqualInput.value = 70;
    winRateVsSlightlyLowerInput.value = 70;
    winRateVsMuchLowerInput.value = 80;


    // Tier境界レートの初期値 (ご指定の13個の値を上から順に割り当て)
    const initialTierRates = {
        'フロンティア マスター': 3500,
        'フロンティア ダイヤモンド': 3062,
        'フロンティア プラチナ': 2733,
        'ゴールド 1': 2628,
        'ゴールド 2': 2369,
        'ゴールド 3': 2181,
        'シルバー 1': 2074,
        'シルバー 2': 1870,
        'シルバー 3': 1745,
        'ブロンズ 1': 1659,
        'ブロンズ 2': 1579,
        'ブロンズ 3': 1029 // ご指定の最後の値
        // 1491 が余りますが、Tier数が12なので、今回は使用しません。
        // もしTierの定義が増える場合は、この値を活用できます。
    };

    // 公式情報に基づいたTierデータと割合（percentage）
    const TIER_DATA = [
        { name: 'フロンティア マスター', percentage: 0.01 },
        { name: 'フロンティア ダイヤモンド', percentage: 0.04 },
        { name: 'フロンティア プラチナ', percentage: 0.05 },
        { name: 'ゴールド 1', percentage: 0.0667 },
        { name: 'ゴールド 2', percentage: 0.0667 },
        { name: 'ゴールド 3', percentage: 0.0667 },
        { name: 'シルバー 1', percentage: 0.10 },
        { name: 'シルバー 2', percentage: 0.10 },
        { name: 'シルバー 3', percentage: 0.10 },
        { name: 'ブロンズ 1', percentage: 0.1330 },
        { name: 'ブロンズ 2', percentage: 0.1330 },
        { name: 'ブロンズ 3', percentage: 0.1330 }
    ];

    // Tier境界レートの入力フィールドを動的に生成
    function generateTierRateInputs() {
        let htmlContent = '';
        TIER_DATA.forEach(tier => {
            // ブロンズ3は最低レートなので入力不要
            if (tier.name === 'ブロンズ 3') {
                return;
            }
            htmlContent += `
                <div class="input-group">
                    <label for="rate-${tier.name.replace(/\s/g, '-')}-min">${tier.name} 最低レート:</label>
                    <input type="number" id="rate-${tier.name.replace(/\s/g, '-')}-min"
                           value="${initialTierRates[tier.name] || ''}" placeholder="例: ${initialTierRates[tier.name] || '1000'}" min="0">
                </div>
            `;
        });
        tierRateBoundariesDiv.innerHTML += htmlContent; // 既存のpタグの後に追記
    }
    generateTierRateInputs();


    /**
     * 現在のレートと順位から、ランダムな対戦相手のレートを推定する関数。
     * マッチング仕様「上下30人」を考慮。
     * @param {number} currentRate 現在のレート
     * @param {number} currentRank 現在の順位
     * @param {number} totalPlayers ランクマッチの参加人数
     * @param {object} tierRates 各Tierの最低レート
     * @returns {number} 推定された対戦相手のレート
     */
    function getOpponentRate(currentRate, currentRank, totalPlayers, tierRates) {
        // マッチング仕様に基づき、現在の順位から上下30人の範囲でランダムなオフセットを生成
        // ただし、順位は1位からtotalPlayersまで
        const minRankOffset = Math.max(1 - currentRank, -30);
        const maxRankOffset = Math.min(totalPlayers - currentRank, 30);
        const randomOffset = Math.floor(Math.random() * (maxRankOffset - minRankOffset + 1)) + minRankOffset;
        const opponentRank = currentRank + randomOffset;

        // 簡易的な相手レート推定ロジック
        // 実際のゲームでは、順位が近いほどレートも近い傾向にあるが、厳密な計算は複雑
        // ここでは、Tier境界レートと現在のレートを基に相手レートを決定する、より現実的な方法を試みる。
        // 現在のレートと相手の順位から、最も近いTierの境界レートを探し、その間のレートをランダムに選択する
        // より正確なシミュレーションには、Rank -> Rateの関数やデータが必要

        let estimatedOpponentRate = currentRate; // 初期値として自分のレート
        let currentTierMinRate = 0;
        let nextLowerTierMinRate = 0;
        let currentTierName = '';

        // まず、自分のレートがどのTierに属するかを特定
        // TIER_DATA は上位から順に並んでいるので、逆順にチェック
        const sortedTierDataReverse = [...TIER_DATA].sort((a, b) => {
            const tierOrder = {
                'フロンティア マスター': 1,
                'フロンティア ダイヤモンド': 2,
                'フロンティア プラチナ': 3,
                'ゴールド 1': 4, 'ゴールド 2': 5, 'ゴールド 3': 6,
                'シルバー 1': 7, 'シルバー 2': 8, 'シルバー 3': 9,
                'ブロンズ 1': 10, 'ブロンズ 2': 11, 'ブロンズ 3': 12
            };
            return tierOrder[b.name] - tierOrder[a.name]; // 逆順（ブロンズ3からマスター）
        });

        for (const tier of sortedTierDataReverse) {
            const tierMinRate = tierRates[tier.name];
            if (currentRate >= tierMinRate) {
                currentTierMinRate = tierMinRate;
                currentTierName = tier.name;
                // そのTierの一つ上のTierの最低レートを取得（現在のTierの上限レートとみなす）
                const currentTierIndex = sortedTierDataReverse.indexOf(tier);
                if (currentTierIndex > 0) {
                    nextLowerTierMinRate = tierRates[sortedTierDataReverse[currentTierIndex - 1].name]; // 一つ上のTierの最低レート
                } else {
                    nextLowerTierMinRate = currentTierMinRate + 500; // マスターなど最上位の場合は適当な上限
                }
                break;
            }
        }
        
        // 相手の順位(opponentRank)から相手のTierを推定し、そのTierのレート範囲内でランダムに選択
        let opponentTierName = '';
        let opponentTierMinRate = 0;
        let opponentTierMaxRate = 0;

        let cumulativeRankCeiling = 0;
        let prevCumulativeRankCeiling = 0;

        for (const tier of TIER_DATA) { // TIER_DATA は上位から順に並んでいる
            prevCumulativeRankCeiling = cumulativeRankCeiling;
            cumulativeRankCeiling = Math.ceil(totalPlayers * (cumulativePercentage + tier.percentage));
            
            if (opponentRank <= cumulativeRankCeiling) { // 相手の順位がこのTierの範囲内であれば
                opponentTierName = tier.name;
                opponentTierMinRate = tierRates[tier.name];
                
                // 相手のTierの上限レートは、そのTierの一つ上のTierの最低レート（存在すれば）
                const currentTierIndex = TIER_DATA.indexOf(tier);
                if (currentTierIndex > 0) {
                    opponentTierMaxRate = tierRates[TIER_DATA[currentTierIndex - 1].name];
                } else {
                    opponentTierMaxRate = opponentTierMinRate + 500; // マスターなど最上位の場合は適当な上限
                }
                break;
            }
        }
        
        // 推定された相手Tierのレート範囲内でランダムなレートを生成
        if (opponentTierName) {
            // レート範囲の最小値と最大値を設定
            const lowerBound = opponentTierMinRate;
            const upperBound = opponentTierMaxRate;
            
            // 下限と上限の間でランダムにレートを生成
            estimatedOpponentRate = Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound;
        } else {
            // Tierが特定できない場合（エラーケースや極端なレート）は、簡易的な乱数を生成
            estimatedOpponentRate = currentRate + (Math.random() * 200) - 100;
        }

        return Math.max(0, estimatedOpponentRate); // レートは0以下にならない
    }


    /**
     * 計算結果を元にTierと推定レート帯の目安を表示する
     * @param {number} totalPlayers ランクマッチの参加人数
     * @param {object} tierRates 各Tierの最低レート
     */
    function displayTierEstimates(totalPlayers, tierRates) {
        let htmlContent = '';
        let cumulativePercentage = 0;

        // TIER_DATAは上位から定義されているため、そのまま使用し、rankLimitを算出
        const sortedTierData = [...TIER_DATA].sort((a, b) => {
            // Tierの順序に基づいてソート（フロンティアマスターが一番上）
            const tierOrder = {
                'フロンティア マスター': 1,
                'フロンティア ダイヤモンド': 2,
                'フロンティア プラチナ': 3,
                'ゴールド 1': 4, 'ゴールド 2': 5, 'ゴールド 3': 6,
                'シルバー 1': 7, 'シルバー 2': 8, 'シルバー 3': 9,
                'ブロンズ 1': 10, 'ブロンズ 2': 11, 'ブロンズ 3': 12
            };
            return tierOrder[a.name] - tierOrder[b.name];
        });

        tierRateTableBody.innerHTML = ''; // テーブル内容をクリア

        for (let i = 0; i < sortedTierData.length; i++) {
            const tier = sortedTierData[i];
            
            // 順位範囲の計算: 上位から累積パーセンテージで算出
            const rankStart = (i === 0) ? 1 : Math.ceil(totalPlayers * (cumulativePercentage)) + 1;
            cumulativePercentage += tier.percentage;
            const rankEnd = Math.ceil(totalPlayers * cumulativePercentage);

            // Tier境界レートの取得
            const minRate = tierRates[tier.name];
            let rateRangeDisplay;

            if (tier.name === 'フロンティア マスター') {
                rateRangeDisplay = `${minRate} 〜`;
            } else if (tier.name === 'ブロンズ 3') {
                // 最下位Tierのレートは「~そのTierの最低レート」
                rateRangeDisplay = `〜 ${minRate}`;
            } else {
                // 現在のTierの最低レートとその次のTier（より低いTier）の最低レートの間
                const nextLowerTier = sortedTierData[i + 1];
                if (nextLowerTier) {
                    rateRangeDisplay = `${tierRates[nextLowerTier.name]} 〜 ${minRate}`;
                } else {
                    rateRangeDisplay = `〜 ${minRate}`; // フォールバック
                }
            }

            const row = tierRateTableBody.insertRow();
            const tierNameCell = row.insertCell(); // Tier名用のセルを追加
            const rankCell = row.insertCell();
            const rateCell = row.insertCell();

            // ここで順位範囲と推定レート帯の表示順を修正
            tierNameCell.textContent = tier.name; // Tier名を表示
            rankCell.textContent = `${rankStart} 位 〜 ${rankEnd} 位`;
            rateCell.textContent = rateRangeDisplay;
        }
    }


    // --- メイン計算ロジック ---
    calculateButton.addEventListener('click', () => {
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value);
        const losses = parseInt(lossesInput.value);
        let currentRate = parseInt(currentRateInput.value);
        const targetRateIncrease = parseInt(targetRateIncreaseInput.value);
        const totalPlayers = parseInt(totalPlayersInput.value);

        // Tier境界レートの取得とバリデーション
        const tierRates = {};
        let allTierRatesProvided = true;
        // TIER_DATAをループする際に、ブロンズ3は入力不要とする
        TIER_DATA.forEach(tier => {
            if (tier.name === 'ブロンズ 3') {
                tierRates[tier.name] = initialTierRates['ブロンズ 3']; // 初期値を活用
                return;
            }
            const inputId = `rate-${tier.name.replace(/\s/g, '-')}-min`;
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                const rate = parseInt(inputElement.value);
                if (isNaN(rate) || rate < 0) {
                    allTierRatesProvided = false;
                    alert(`「${tier.name} 最低レート」に有効な数値を入力してください。`);
                    return; // ループを中断
                }
                tierRates[tier.name] = rate;
            } else {
                allTierRatesProvided = false;
                alert(`Tierレート入力フィールドが見つかりません: ${inputId}`); // デバッグ用
                return;
            }
        });

        if (!allTierRatesProvided) {
            return; // 処理を中断
        }
        
        // 入力値の基本バリデーション
        if (isNaN(wins) || isNaN(losses) || isNaN(currentRate) || isNaN(targetRateIncrease) || isNaN(totalPlayers) ||
            wins < 0 || losses < 0 || currentRate < 0 || targetRateIncrease < 0 || totalPlayers < 1) {
            alert('全ての入力項目に有効な数値を入力してください。');
            return;
        }

        // Tier境界レートの論理的な順序チェック（上位Tierのレート > 下位Tierのレート）
        // TIER_DATAは上位から下位の順に並んでいるので、そのままループ
        let ratesAreOrdered = true;
        for (let i = 0; i < TIER_DATA.length - 1; i++) {
            const currentTierName = TIER_DATA[i].name;
            const nextTierName = TIER_DATA[i+1].name;

            if (tierRates[currentTierName] <= tierRates[nextTierName]) {
                alert(`${currentTierName} の最低レート (${tierRates[currentTierName]}) は ${nextTierName} の最低レート (${tierRates[nextTierName]}) より高く設定してください。`);
                ratesAreOrdered = false;
                break;
            }
        }
        if (!ratesAreOrdered) return;


        const winRateVsMuchHigher = parseFloat(winRateVsMuchHigherInput.value) / 100;
        const winRateVsSlightlyHigher = parseFloat(winRateVsSlightlyHigherInput.value) / 100;
        const winRateVsEqual = parseFloat(winRateVsEqualInput.value) / 100;
        const winRateVsSlightlyLower = parseFloat(winRateVsSlightlyLowerInput.value) / 100;
        const winRateVsMuchLower = parseFloat(winRateVsMuchLowerInput.value) / 100;

        if (isNaN(winRateVsMuchHigher) || isNaN(winRateVsSlightlyHigher) || isNaN(winRateVsEqual) ||
            isNaN(winRateVsSlightlyLower) || isNaN(winRateVsMuchLower) ||
            winRateVsMuchHigher < 0 || winRateVsMuchHigher > 1 ||
            winRateVsSlightlyHigher < 0 || winRateVsSlightlyHigher > 1 ||
            winRateVsEqual < 0 || winRateVsEqual > 1 ||
            winRateVsSlightlyLower < 0 || winRateVsSlightlyLower > 1 ||
            winRateVsMuchLower < 0 || winRateVsMuchLower > 1) {
            alert('勝率は0%から100%の間で入力してください。');
            return;
        }

        // --- 2. 各種計算 ---

        const totalMatches = wins + losses;
        const currentWinRate = totalMatches === 0 ? 0 : (wins / totalMatches) * 100;

        // 現在の順位を推定（Tier境界レートから逆算）
        let currentRank = totalPlayers; // 初期値として最下位と仮定
        // 現在のレートがどのTierに属するかを特定
        for (let i = 0; i < TIER_DATA.length; i++) {
            const tierName = TIER_DATA[i].name;
            const tierMinRate = tierRates[tierName];
            // 自分のレートが現在のTierの最低レート以上の場合
            if (currentRate >= tierMinRate) {
                // このTierの順位範囲の上限を計算 (例: Fマスターなら totalPlayers * 0.01)
                let cumulativePercentageForRank = 0;
                for(let j = 0; j <= i; j++) {
                    cumulativePercentageForRank += TIER_DATA[j].percentage;
                }
                const rankCeiling = Math.ceil(totalPlayers * cumulativePercentageForRank);

                // このTierの順位範囲の下限を計算 (例: Fマスターなら 1)
                let cumulativePercentageForRankLower = 0;
                for(let j = 0; j < i; j++) {
                    cumulativePercentageForRankLower += TIER_DATA[j].percentage;
                }
                const rankFloor = Math.ceil(totalPlayers * cumulativePercentageForRankLower) + 1;

                // レートが高いほど順位が高いと仮定し、Tier内の相対位置から順位を推定
                // 例: Fマスター内での位置 (0-100%) を順位範囲にマッピング
                const tierRateRange = (i > 0) ? (tierRates[TIER_DATA[i-1].name] - tierMinRate) : 500; // 上位Tierの最低レート - 自分のTierの最低レート
                const myRateInTier = currentRate - tierMinRate;
                let rankInTierRatio = 0;
                if (tierRateRange > 0) {
                     rankInTierRatio = 1 - (myRateInTier / tierRateRange); // 高いレートほど小さい値 (0に近づく)
                }
               
                currentRank = Math.round(rankFloor + (rankCeiling - rankFloor) * rankInTierRatio);
                break; // 該当Tierが見つかったらループ終了
            }
        }
        currentRank = Math.max(1, Math.min(totalPlayers, currentRank)); // 順位は1以上totalPlayers以下

        // シミュレーション実行
        let simulatedRate = currentRate;
        let simulatedWins = wins;
        let simulatedLosses = losses;
        let rateChangesSum = 0;

        const simulationMatches = 100; // 100戦後の期待値計算用

        for (let i = 0; i < simulationMatches; i++) {
            const opponentRate = getOpponentRate(simulatedRate, currentRank, totalPlayers, tierRates);
            let rateChange = 0;

            // 相手レートとの差を基に勝率を決定
            const rateDifference = simulatedRate - opponentRate;
            let winProbability;

            // レート差の閾値を明確化
            const muchHigherThreshold = -200; // 相手が自分より200以上高い
            const slightlyHigherThreshold = -50;  // 相手が自分より50以上高く、200未満
            const equalThreshold = 50;           // レート差が-50から50
            const slightlyLowerThreshold = 200;  // 相手が自分より50以上低く、200未満

            if (rateDifference <= muchHigherThreshold) { // かなりレートが高い相手
                winProbability = winRateVsMuchHigher;
            } else if (rateDifference < slightlyHigherThreshold) { // ややレートが高い相手
                winProbability = winRateVsSlightlyHigher;
            } else if (rateDifference >= slightlyHigherThreshold && rateDifference <= equalThreshold) { // 同等のレートの相手
                winProbability = winRateVsEqual;
            } else if (rateDifference > equalThreshold && rateDifference <= slightlyLowerThreshold) { // ややレートが低い相手
                winProbability = winRateVsSlightlyLower;
            } else { // かなりレートが低い相手
                winProbability = winRateVsMuchLower;
            }

            if (Math.random() < winProbability) { // 勝利
                rateChange = 16 + (opponentRate - simulatedRate) * rateDiffCoefficient;
                if (rateChange < 1) rateChange = 1; // 最低獲得ポイント
                simulatedWins++;
            } else { // 敗北
                // 敗北時の計算式修正: (ランクマッチ全体の勝利数/ランクマッチ全体の敗北数) を 1.0 と仮定
                // 理由: この係数はプレイヤーが確認できない全体データであり、シミュレーションの精度を保ちつつ、
                // 最もシンプルな仮定として、長期的には勝利数と敗北数が概ね等しくなると想定し、1.0を用いる。
                rateChange = (16 + (simulatedRate - opponentRate) * rateDiffCoefficient) * (-1.0) * 1.0; 
                if (rateChange > -1) rateChange = -1; // 最低喪失ポイント
                simulatedLosses++;
            }
            simulatedRate += rateChange;
            rateChangesSum += rateChange;
        }

        const expectedRate100Matches = currentRate + (rateChangesSum / simulationMatches) * 100;

        // 目標レート達成までの必要勝利数計算
        const targetRate = currentRate + targetRateIncrease;
        let neededWins = 0;
        
        // 平均的なレート変動を仮定
        const averageWinProb = (winRateVsMuchHigher + winRateVsSlightlyHigher + winRateVsEqual + winRateVsSlightlyLower + winRateVsMuchLower) / 5;
        
        // 平均的な勝利と敗北のレート変動（同等レートの相手との対戦を仮定）
        const averageWinGain = 16 + (0) * rateDiffCoefficient; // 同等相手との勝利
        const averageLossLoss = (16 + (0) * rateDiffCoefficient) * (-1.0) * 1.0; // 同等相手との敗北

        // 各試合での期待レート変動を計算
        let expectedRateChangePerMatch = (averageWinProb * averageWinGain) + ((1 - averageWinProb) * averageLossLoss);
        
        if (expectedRateChangePerMatch <= 0) {
            neededWinsForTargetDisplay.textContent = '計算不能（目標達成が困難）';
        } else {
            // 目標レートに達するまでに必要な試合数
            const matchesToTarget = targetRateIncrease / expectedRateChangePerMatch;
            neededWins = Math.ceil(matchesToTarget * averageWinProb); // 必要な勝利数のみ概算
            if (neededWins < 0) neededWins = 0; // マイナスにはならない
            neededWinsForTargetDisplay.textContent = neededWins;
        }


        // --- 詳細なレート変動量 (1勝または1敗あたり) ---
        const detailedRateChanges = {};
        const rateDifferences = {
            muchHigher: -250, // 相手が自分よりかなり高いレート（例: -250）
            slightlyHigher: -100, // やや高い（例: -100）
            equal: 0, // 同等（例: 0）
            slightlyLower: 100, // やや低い（例: 100）
            muchLower: 250 // かなり低い（例: 250）
        };

        for (const category in rateDifferences) {
            const adjustedOpponentRate = currentRate - rateDifferences[category]; // 相手レート = 自分レート - 差分
            
            let gain = 16 + (adjustedOpponentRate - currentRate) * rateDiffCoefficient;
            if (gain < 1) gain = 1;
            
            // 敗北時の計算式にも1.0の係数を適用
            let loss = (16 + (currentRate - adjustedOpponentRate) * rateDiffCoefficient) * (-1.0) * 1.0; 
            if (loss > -1) loss = -1;
            
            detailedRateChanges[category] = { gain: gain.toFixed(1), loss: loss.toFixed(1) };
        }

        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain}`;
        lossSlightallyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss}`;
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss}`;


        // --- 4. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        // neededWinsForTargetDisplay は上記で設定済み

        // Tierと推定レート帯の目安の表示を更新
        displayTierEstimates(totalPlayers, tierRates);
    });
});
