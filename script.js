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
    const lossSlightlyLowerCalculated = document.getElementById('lossSlightlyLowerCalculated');
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    const tierRateEstimatesDiv = document.getElementById('tierRateEstimates');


    // Tierごとの情報（割合のみを持つ。rankLimitは動的に計算）
    const TIER_PERCENTAGES = [
        { name: 'フロンティア マスター', percentage: 1 },
        { name: 'フロンティア ダイヤモンド', percentage: 4 },
        { name: 'フロンティア プラチナ', percentage: 5 },
        { name: 'ゴールド 1', percentage: 6.67 },
        { name: 'ゴールド 2', percentage: 6.67 },
        { name: 'ゴールド 3', percentage: 6.67 },
        { name: 'シルバー 1', percentage: 10 },
        { name: 'シルバー 2', percentage: 10 },
        { name: 'シルバー 3', percentage: 10 },
        { name: 'ブロンズ 1', percentage: 13.30 },
        { name: 'ブロンズ 2', percentage: 13.30 },
        { name: 'ブロンズ 3', percentage: 13.30 }
    ];

    // --- Tierの境界レート入力欄を動的に生成 ---
    const initialTierRates = {
        // 初期値をすべて削除し、placeholderを使用
        'rateTierMasterTop': '',
        'rateTierフロンティアマスターMin': '',
        'rateTierフロンティアダイヤモンドMin': '',
        'rateTierフロンティアプラチナMin': '',
        'rateTierゴールド1Min': '',
        'rateTierゴールド2Min': '',
        'rateTierゴールド3Min': '',
        'rateTierシルバー1Min': '',
        'rateTierシルバー2Min': '',
        'rateTierシルバー3Min': '',
        'rateTierブロンズ1Min': '',
        'rateTierブロンズ2Min': '',
        'rateTierブロンズ3Min': 0 // ブロンズ3の最低レートは0で固定
    };

    function generateTierBoundaryInputs() {
        let html = '';
        html += `<div class="input-group">
                    <label for="rateTierMasterTop">フロンティア マスター (最上位レート):</label>
                    <input type="number" id="rateTierMasterTop" value="${initialTierRates['rateTierMasterTop']}" placeholder="例: 3500" min="0">
                </div>`;
        for (let i = 0; i < TIER_PERCENTAGES.length - 1; i++) {
            const tier = TIER_PERCENTAGES[i];
            const tierNameWithoutSpace = tier.name.replace(/\s+/g, '');
            const inputId = `rateTier${tierNameWithoutSpace}Min`; // 生成されるID
            const initialValue = initialTierRates[inputId]; // IDで取得
            html += `<div class="input-group">
                        <label for="${inputId}">${tier.name} (最低レート):</label>
                        <input type="number" id="${inputId}" value="${initialValue}" placeholder="${i === 0 ? '例: 3062 (マスター最低)' : (i === 1 ? '例: 2733 (ダイヤモンド最低)' : (i === 2 ? '例: 2628 (プラチナ最低)' : '例: 2000'))}" min="0">
                    </div>`;
        }
        // ブロンズ3の初期値も設定
        const bronze3InputId = `rateTier${TIER_PERCENTAGES[TIER_PERCENTAGES.length - 1].name.replace(/\s+/g, '')}Min`;
        const bronze3InitialValue = initialTierRates[bronze3InputId];
        html += `<div class="input-group">
                    <label for="${bronze3InputId}">ブロンズ 3 (最低レート):</label>
                    <input type="number" id="${bronze3InputId}" value="${bronze3InitialValue}" min="0">
                </div>`;
        tierRateBoundariesDiv.innerHTML = html;
    }

    generateTierBoundaryInputs();

    // --- シミュレーション実行ボタンクリックイベント ---
    calculateButton.addEventListener('click', () => {
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value) || 0;
        const losses = parseInt(lossesInput.value) || 0;
        let currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value) || 0;
        let totalPlayers = parseInt(totalPlayersInput.value); // let に変更

        const rateDiffCoefficient = 0.04; // 公式情報より固定値
        const winLossRatioMultiplier = 1.0; // 「ランクマッチ全体の勝利数/ランクマッチ全体の敗北数」はユーザー確認不可のため1.0固定

        const winRates = {
            'muchHigher': parseFloat(winRateVsMuchHigherInput.value),
            'slightlyHigher': parseFloat(winRateVsSlightlyHigherInput.value),
            'equal': parseFloat(winRateVsEqualInput.value),
            'slightlyLower': parseFloat(winRateVsSlightlyLowerInput.value),
            'muchLower': parseFloat(winRateVsMuchLowerInput.value)
        };

        const inputTierRates = {};
        let missingTierRateInput = false;

        const masterTopRateInput = document.getElementById('rateTierMasterTop');
        if (masterTopRateInput) {
            const masterTopRate = parseFloat(masterTopRateInput.value);
            if (isNaN(masterTopRate) || masterTopRateInput.value.trim() === '') {
                missingTierRateInput = true;
            } else {
                inputTierRates['フロンティア マスター_top'] = masterTopRate;
            }
        } else {
            missingTierRateInput = true;
        }

        for (let i = 0; i < TIER_PERCENTAGES.length; i++) {
            const tier = TIER_PERCENTAGES[i];
            const tierName = tier.name;
            const inputId = `rateTier${tierName.replace(/\s+/g, '')}Min`;
            const tierInput = document.getElementById(inputId);

            if (tierInput) {
                const rate = parseFloat(tierInput.value);
                if (isNaN(rate) || tierInput.value.trim() === '') { // NaNまたは空文字列は未入力
                    // ブロンズ3の0は許容するが、parseFloat(0)は0になるので問題なし
                    if (!(tierName === 'ブロンズ 3' && tierInput.value.trim() === '0')) {
                        missingTierRateInput = true;
                        break;
                    }
                }
                inputTierRates[tierName] = rate;
            } else {
                missingTierRateInput = true;
                break;
            }
        }

        if (missingTierRateInput) {
            alert('Tierの境界レート設定のすべての項目を正しく入力してください。\n（半角数字で、空欄がないようにしてください）');
            return;
        }

        // currentRateのバリデーションと初期値設定
        if (isNaN(currentRate) || currentRateInput.value.trim() === '') {
            currentRate = 0; // 空欄の場合の初期値
        }

        // totalPlayersのバリデーションと初期値設定
        if (isNaN(totalPlayers) || totalPlayers <= 0 || totalPlayersInput.value.trim() === '') {
            totalPlayers = 250; // 空欄または不正な場合のデフォルト値
        }

        for (const key in winRates) {
            if (isNaN(winRates[key]) || winRates[key] < 0 || winRates[key] > 100) {
                alert('対戦相手レート別の勝利割合をすべて0～100の範囲で入力してください。');
                return;
            }
        }

        if (wins === 0 && losses === 0) {
            alert('勝ち数か負け数のどちらか、または両方を入力してください。');
            winsInput.focus();
            return;
        }


        // --- 2. 各種計算処理 ---

        // 動的な TIER_DATA の生成（rankLimitをtotalPlayersに基づいて計算）
        const dynamicTierData = JSON.parse(JSON.stringify(TIER_PERCENTAGES)); // TIER_PERCENTAGESのディープコピー
        let cumulativeRankLimit = 0;
        for (let i = 0; i < dynamicTierData.length; i++) {
            const tier = dynamicTierData[i];
            // 各Tierの人数を計算し、累積していく
            const tierPlayers = Math.round(totalPlayers * (tier.percentage / 100));
            cumulativeRankLimit += tierPlayers;
            tier.rankLimit = cumulativeRankLimit;

            // 最後のTierはtotalPlayersに強制的に合わせる
            if (i === dynamicTierData.length - 1) {
                tier.rankLimit = totalPlayers;
            } else if (tier.rankLimit <= (i > 0 ? dynamicTierData[i-1].rankLimit : 0)) {
                // 順位が逆転しないように最低1は確保
                tier.rankLimit = (i > 0 ? dynamicTierData[i-1].rankLimit : 0) + 1;
            }
        }

        // Tierの境界レート帯を計算
        const tierRateBounds = {};
        let prevMaxRate = inputTierRates['フロンティア マスター_top']; // マスターのトップレートから開始

        for (let i = 0; i < dynamicTierData.length; i++) {
            const tier = dynamicTierData[i];
            const tierName = tier.name;
            const minRate = inputTierRates[tierName];
            const maxRate = prevMaxRate; // 前のTierの最低レートが現在のTierの最高レートとなる

            tierRateBounds[tierName] = { min: minRate, max: maxRate };
            prevMaxRate = minRate; // 次のTierの最高レートのために現在のTierの最低レートを保存
        }
        
        // ブロンズ3の最低レートは0で固定されるため、ここで特別に上限レートを設定
        if (tierRateBounds['ブロンズ 3']) {
            const bronze2MinRate = inputTierRates[TIER_PERCENTAGES[TIER_PERCENTAGES.length - 2].name]; 
            tierRateBounds['ブロンズ 3'].max = bronze2MinRate; 
        }

        // Tierと推定レート帯の表示
        let tierEstimateHtml = '<p>ランクマッチ参加人数とTier割合に基づき、各Tierの推定レート帯を表示します。</p><ul>';
        for (const tierName in tierRateBounds) {
            const bounds = tierRateBounds[tierName];
            const displayMin = Math.min(bounds.min, bounds.max);
            const displayMax = Math.max(bounds.min, bounds.max);
            tierEstimateHtml += `<li><strong>${tierName}:</strong> ${displayMin.toFixed(0)} - ${displayMax.toFixed(0)}</li>`;
        }
        tierEstimateHtml += '</ul>';
        tierRateEstimatesDiv.innerHTML = tierEstimateHtml;


        // 順位からレートを推定するヘルパー関数
        const getRateFromRank = (rank, totalPlayers, tierBounds, dynamicTierData) => {
            const masterTierName = dynamicTierData[0].name;
            const bronze3TierName = dynamicTierData[dynamicTierData.length - 1].name;

            // 最高ランクの場合、マスターの最上位レートを返す
            if (rank <= dynamicTierData[0].rankLimit && tierBounds[masterTierName]) {
                 return tierBounds[masterTierName].max;
            }

            // 最低ランクの場合、ブロンズ3の最低レートを返す
            if (rank > dynamicTierData[dynamicTierData.length - 1].rankLimit && tierBounds[bronze3TierName]) {
                return tierBounds[bronze3TierName].min;
            }

            for (let i = 0; i < dynamicTierData.length; i++) {
                const tier = dynamicTierData[i];
                const lowerRankLimit = (i > 0 ? dynamicTierData[i-1].rankLimit : 0) + 1;
                const upperRankLimit = tier.rankLimit;

                if (rank >= lowerRankLimit && rank <= upperRankLimit) {
                    const minRate = tierBounds[tier.name].min;
                    const maxRate = tierBounds[tier.name].max;
                    
                    // ランクの範囲とレートの範囲を線形補間
                    // ランクが低いほどレートが高い (例: 1位が高レート、250位が低レート)
                    const rankProgress = (rank - lowerRankLimit) / (upperRankLimit - lowerRankLimit + 1);
                    return maxRate - (maxRate - minRate) * rankProgress;
                }
            }
            // どのTierにも当てはまらない場合は、デフォルト値やエラー処理
            return currentRate; // フォールバックとして現在のレートを返す
        };

        // 自分の順位を推定
        let estimatedPlayerRank = 1;
        let playerTierData = null;
        for (const tierName in tierRateBounds) {
            const min = Math.min(tierRateBounds[tierName].min, tierRateBounds[tierName].max);
            const max = Math.max(tierRateBounds[tierName].min, tierRateBounds[tierName].max);

            if (currentRate >= min && currentRate <= max) {
                playerTierData = TIER_PERCENTAGES.find(t => t.name === tierName); // 元のTIER_PERCENTAGESからTier情報を取得
                break;
            }
        }

        // Tier境界を外れるレートの特殊処理（最高レートより上、最低レートより下）
        if (!playerTierData) {
            const masterTier = TIER_PERCENTAGES[0].name;
            const bronze3Tier = TIER_PERCENTAGES[TIER_PERCENTAGES.length - 1].name;

            // currentRateがマスターの最上位レートより高い場合
            if (currentRate > tierRateBounds[masterTier].max) {
                playerTierData = TIER_PERCENTAGES[0];
            }
            // currentRateがブロンズ3の最低レートより低い場合
            else if (currentRate < tierRateBounds[bronze3Tier].min) {
                playerTierData = TIER_PERCENTAGES[TIER_PERCENTAGES.length - 1];
            } else {
                 // ここに到達することは、理論的にはTier境界レートが正しく設定されていればないはずだが、念のため
                 playerTierData = TIER_PERCENTAGES[TIER_PERCENTAGES.length - 1];
            }
        }

        // 自分の順位を推定 (動的な rankLimit を使用)
        if (playerTierData) {
            const currentTierIndex = dynamicTierData.findIndex(t => t.name === playerTierData.name);
            const lowerRankLimitOfPrevTier = (currentTierIndex > 0) ? dynamicTierData[currentTierIndex - 1].rankLimit : 0;
            const currentTierRankRange = dynamicTierData[currentTierIndex].rankLimit - lowerRankLimitOfPrevTier;

            const playerMinRateInTier = tierRateBounds[playerTierData.name].min;
            const playerMaxRateInTier = tierRateBounds[playerTierData.name].max;

            // Tier内のレート範囲とランクの範囲をマッピングして推定順位を計算
            // レートが高いほどランクが高い（数字が小さい）
            // maxRateInTier -> lowerRankLimitOfPrevTier + 1
            // minRateInTier -> currentTierData.rankLimit
            
            // レート範囲が0の場合は均等に割り振るか、Tierの真ん中など
            if (playerMaxRateInTier - playerMinRateInTier === 0) {
                estimatedPlayerRank = lowerRankLimitOfPrevTier + Math.round(currentTierRankRange / 2);
            } else {
                const rateProgressInTier = (playerMaxRateInTier - currentRate) / (playerMaxRateInTier - playerMinRateInTier);
                estimatedPlayerRank = lowerRankLimitOfPrevTier + Math.round(currentTierRankRange * rateProgressInTier);
                estimatedPlayerRank = Math.max(lowerRankLimitOfPrevTier + 1, Math.min(dynamicTierData[currentTierIndex].rankLimit, estimatedPlayerRank));
            }
        }
        estimatedPlayerRank = Math.max(1, Math.min(totalPlayers, estimatedPlayerRank)); // 1位から総人数までに収める


        const SIMULATION_MATCHES = 100;
        let totalRateChangeSum = 0;

        for (let i = 0; i < SIMULATION_MATCHES; i++) {
            // 上下30人の範囲でランダムに対戦相手を選定
            const opponentRankOffset = Math.floor(Math.random() * 61) - 30; // -30 から +30
            let opponentRank = estimatedPlayerRank + opponentRankOffset;

            // ランクの境界チェック (1位から totalPlayers まで)
            opponentRank = Math.max(1, opponentRank); // 1位より下にならない
            opponentRank = Math.min(totalPlayers, opponentRank); // totalPlayersより上にならない

            const opponentRate = getRateFromRank(opponentRank, totalPlayers, tierRateBounds, dynamicTierData); // dynamicTierDataを渡す

            let winProbability = 50; // デフォルトは50%
            const rateDifference = currentRate - opponentRate; // 自分のレート - 相手のレート

            // レート差に応じた勝率の調整
            // これは既存のロジックを踏襲
            if (rateDifference > 200) { // かなり高い
                winProbability = winRates.muchHigher;
            } else if (rateDifference > 50) { // やや高い
                winProbability = winRates.slightlyHigher;
            } else if (rateDifference >= -50) { // 同等 (±50)
                winProbability = winRates.equal;
            } else if (rateDifference > -200) { // やや低い
                winProbability = winRates.slightlyLower;
            } else { // かなり低い
                winProbability = winRates.muchLower;
            }

            const didWin = Math.random() * 100 < winProbability;

            let rateChange = 0;
            if (didWin) {
                rateChange = 16 + (opponentRate - currentRate) * rateDiffCoefficient;
                if (rateChange < 1) rateChange = 1; // 勝利時の最低レートポイントは1
            } else {
                // 敗北時の計算式に winLossRatioMultiplier (1.0) を適用
                rateChange = (16 + (currentRate - opponentRate) * rateDiffCoefficient) * winLossRatioMultiplier * (-1.0);
                if (rateChange > -1) rateChange = -1; // 敗北時の最低喪失レートポイントは1
            }
            totalRateChangeSum += rateChange;
        }

        const averageExpectedRateChangePerMatch = totalRateChangeSum / SIMULATION_MATCHES;
        const expectedRate100Matches = currentRate + totalRateChangeSum;

        // 目標レート達成までの必要勝利数
        const targetRate = currentRate + targetRateIncrease;
        let neededWins = '算出不可';

        if (averageExpectedRateChangePerMatch > 0) {
            neededWins = Math.ceil(targetRateIncrease / averageExpectedRateChangePerMatch);
        } else if (targetRateIncrease > 0) {
            neededWins = '目標達成は困難'; // レート期待値が0以下なのに目標増加量がある場合
        } else {
            neededWins = 0; // 目標増加量が0以下の場合
        }


        // --- 3. 詳細なレート変動量の計算と表示 ---
        const detailedRateChanges = {};
        const simulatedOpponentRateDifferences = {
            'muchHigher': currentRate - 250, // 相手がかなり低いレート (自分から見てかなり高い)
            'slightlyHigher': currentRate - 100, // 相手がやや低いレート
            'equal': currentRate, // 相手が同等のレート
            'slightlyLower': currentRate + 100, // 相手がやや高いレート
            'muchLower': currentRate + 250 // 相手がかなり高いレート (自分から見てかなり低い)
        };

        for (const category in simulatedOpponentRateDifferences) {
            const simulatedOpponentRate = simulatedOpponentRateDifferences[category];
            const adjustedOpponentRate = Math.max(0, simulatedOpponentRate); // レートがマイナスにならないように調整

            let gain = 16 + (adjustedOpponentRate - currentRate) * rateDiffCoefficient;
            if (gain < 1) gain = 1; // 勝利時の最低レートポイントは1

            let loss = (16 + (currentRate - adjustedOpponentRate) * rateDiffCoefficient) * winLossRatioMultiplier * (-1.0);
            if (loss > -1) loss = -1; // 敗北時の最低喪失レートポイントは1

            detailedRateChanges[category] = { gain: gain.toFixed(1), loss: loss.toFixed(1) };
        }

        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain}`;
        lossSlightlyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss}`;
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss}`;


        // --- 4. 結果の表示 ---
        const totalMatches = wins + losses;
        const currentWinRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        neededWinsForTargetDisplay.textContent = neededWins;
    });

    // winsとlossesの入力があったときにリアルタイムで総試合数と勝率を更新
    [winsInput, lossesInput].forEach(input => {
        input.addEventListener('input', () => {
            const wins = parseInt(winsInput.value) || 0;
            const losses = parseInt(lossesInput.value) || 0;
            const totalMatches = wins + losses;
            const currentWinRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

            totalMatchesDisplay.textContent = totalMatches;
            currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;

            // currentRateの初期値もここで設定（空欄の場合に0とする）
            if (currentRateInput.value.trim() === '') currentRateInput.value = '0';
            // totalPlayersの初期値もここで設定（空欄の場合に250とする）
            if (totalPlayersInput.value.trim() === '') totalPlayersInput.value = '250';
        });
    });
});