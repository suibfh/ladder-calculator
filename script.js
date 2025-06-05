document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const myRankInput = document.getElementById('myRank'); // 自分の順位入力欄
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');
    const totalPlayersInput = document.getElementById('totalPlayers');

    const winRateVsMuchHigherInput = document.getElementById('winRateVsMuchHigher');
    const winRateVsSlightlyHigherInput = document.getElementById('winRateVsSlightlyHigher');
    const winRateVsEqualInput = document.getElementById('winRateVsEqual');
    const winRateVsSlightlyLowerInput = document.getElementById('winRateVsSlightlyLower');
    const winRateVsMuchLowerInput = document.getElementById('winRateVsMuchLower');

    const calculateButton = document.getElementById('calculateButton');

    // --- 出力表示要素 ---
    const validationMessageDisplay = document.getElementById('validationMessage');
    const totalMatchesDisplay = document.getElementById('totalMatchesDisplay');
    const currentWinRateDisplay = document.getElementById('currentWinRate');
    const currentTierDisplay = document.getElementById('currentTierDisplay'); // 現在のTier表示
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
    const lossSlightlyLowerCalculated = document.getElementById('lossSlightlyLowerCalculated'); // 誤字修正済み
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    // Tierと推定レート帯の目安テーブル要素
    const tierRateTableBody = document.querySelector('#tierRateTable tbody');

    // --- Tierデータ構造 ---
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
        { name: 'ブロンズ 1', percentage: 0 },
        { name: 'ブロンズ 2', percentage: 0 },
        { name: 'ブロンズ 3', percentage: 0 }
    ];

    // --- Tier境界レートの初期設定とDOM要素の取得 ---
    const defaultTierRates = {
        'フロンティア マスター1位': 3664,
        'フロンティア マスター': 3062,
        'フロンティア ダイヤモンド': 2757,
        'フロンティア プラチナ': 2637,
        'ゴールド 1': 2352,
        'ゴールド 2': 2190,
        'ゴールド 3': 2094,
        'シルバー 1': 1876,
        'シルバー 2': 1749,
        'シルバー 3': 1670,
        'ブロンズ 1': 1578,
        'ブロンズ 2': 1491,
        'ブロンズ 3': 1029
    };

    // HTMLで記述されたTierレート入力要素を直接取得
    const tierRateInputs = {
        'フロンティア マスター1位': document.getElementById('tierRate-フロンティアマスター1位'),
        'フロンティア マスター': document.getElementById('tierRate-フロンティアマスター'),
        'フロンティア ダイヤモンド': document.getElementById('tierRate-フロンティアダイヤモンド'),
        'フロンティア プラチナ': document.getElementById('tierRate-フロンティアプラチナ'),
        'ゴールド 1': document.getElementById('tierRate-ゴールド1'),
        'ゴールド 2': document.getElementById('tierRate-ゴールド2'),
        'ゴールド 3': document.getElementById('tierRate-ゴールド3'),
        'シルバー 1': document.getElementById('tierRate-シルバー1'),
        'シルバー 2': document.getElementById('tierRate-シルバー2'),
        'シルバー 3': document.getElementById('tierRate-シルバー3'),
        'ブロンズ 1': document.getElementById('tierRate-ブロンズ1'),
        'ブロンズ 2': document.getElementById('tierRate-ブロンズ2'),
        'ブロンズ 3': document.getElementById('tierRate-ブロンズ3')
    };

    // 初期表示時にデフォルト値を入力欄に設定
    for (const tierName in tierRateInputs) {
        if (tierRateInputs[tierName] && defaultTierRates[tierName] !== undefined) {
            tierRateInputs[tierName].value = defaultTierRates[tierName];
        }
    }


    // --- 計算実行関数 ---
    function calculateLadderStats() {
        validationMessageDisplay.textContent = ''; // メッセージをクリア

        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value);
        const losses = parseInt(lossesInput.value);
        const currentRate = parseFloat(currentRateInput.value);
        const myRank = parseInt(myRankInput.value); // 自分の順位
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value);
        const totalPlayers = parseInt(totalPlayersInput.value);

        // Tier境界レートを更新（ユーザー入力値があればそれを優先）
        const currentTierRates = {};
        for (const tierKey in tierRateInputs) {
            const inputElement = tierRateInputs[tierKey];
            const rate = parseFloat(inputElement.value);
            currentTierRates[tierKey] = isNaN(rate) ? defaultTierRates[tierKey] : rate;
        }

        const winRateVs = {
            muchHigher: parseFloat(winRateVsMuchHigherInput.value) / 100,
            slightlyHigher: parseFloat(winRateVsSlightlyHigherInput.value) / 100,
            equal: parseFloat(winRateVsEqualInput.value) / 100,
            slightlyLower: parseFloat(winRateVsSlightlyLowerInput.value) / 100,
            muchLower: parseFloat(winRateVsMuchLowerInput.value) / 100
        };

        // バリデーションチェック
        const errors = [];
        if (isNaN(wins) || wins < 0) errors.push('現在の勝ち数');
        if (isNaN(losses) || losses < 0) errors.push('現在の負け数');
        if (isNaN(currentRate) || currentRate < 0) errors.push('現在のレート');
        if (isNaN(myRank) || myRank < 1) errors.push('自分の順位');
        if (isNaN(targetRateIncrease) || targetRateIncrease < 0) errors.push('目標レート増加量');
        if (isNaN(totalPlayers) || totalPlayers < 1) errors.push('ランクマッチの参加人数');

        Object.keys(winRateVs).forEach(key => {
            if (isNaN(winRateVs[key])) errors.push('対戦相手レート別の勝利割合');
        });

        if (errors.length > 0) {
            validationMessageDisplay.textContent = `⚠️ 以下の項目が未入力または不正な値です: ${[...new Set(errors)].join(', ')}`;
            // 他の計算結果表示をリセット
            totalMatchesDisplay.textContent = '0';
            currentWinRateDisplay.textContent = '0.0%';
            currentTierDisplay.textContent = '-';
            expectedRate100MatchesDisplay.textContent = '0';
            neededWinsForTargetDisplay.textContent = '0';
            tierRateTableBody.innerHTML = '';
            gainMuchHigherCalculated.textContent = '';
            lossMuchHigherCalculated.textContent = '';
            gainSlightlyHigherCalculated.textContent = '';
            lossSlightlyHigherCalculated.textContent = '';
            gainEqualCalculated.textContent = '';
            lossEqualCalculated.textContent = '';
            gainSlightlyLowerCalculated.textContent = '';
            lossSlightlyLowerCalculated.textContent = '';
            gainMuchLowerCalculated.textContent = '';
            lossMuchLowerCalculated.textContent = '';
            return; // 計算を中断
        }
        
        // 自分の順位が参加人数を超えていないかチェック
        if (myRank > totalPlayers) {
            validationMessageDisplay.textContent = '⚠️ 自分の順位がランクマッチ参加人数を超えています。';
            return;
        }

        const totalMatches = wins + losses;
        const currentWinRate = totalMatches === 0 ? 0 : (wins / totalMatches) * 100;

        // --- 2. Tierと推定レート帯の目安の計算 (相手レート算出に必要なので先に実行) ---
        const combinedTierInfo = [];
        let currentRankCumulative = 0;
        let sumOfAllocatedPlayers = 0;

        const silver3Index = TIER_DATA.findIndex(tier => tier.name === 'シルバー 3');
        const bronze1Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 1');
        const bronze2Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 2');
        const bronze3Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 3');
        const orderedTierNames = TIER_DATA.map(tier => tier.name);

        for (let i = 0; i <= silver3Index; i++) {
            const tier = TIER_DATA[i];
            let tierPlayerCount = Math.floor(totalPlayers * tier.percentage);

            if (totalPlayers - sumOfAllocatedPlayers <= 0) {
                tierPlayerCount = 0;
            } else {
                if (tierPlayerCount === 0 && tier.percentage > 0) {
                    tierPlayerCount = 1;
                }
                tierPlayerCount = Math.min(tierPlayerCount, totalPlayers - sumOfAllocatedPlayers);
            }
            tierPlayerCount = Math.max(0, tierPlayerCount);

            const tierStartRank = currentRankCumulative + 1;
            const tierEndRank = currentRankCumulative + tierPlayerCount;

            let minRate = currentTierRates[tier.name];
            let maxRate;

            if (tier.name === 'フロンティア マスター') {
                maxRate = currentTierRates['フロンティア マスター1位'];
            } else {
                maxRate = currentTierRates[orderedTierNames[i - 1]] - 1;
            }
            
            // maxRateがminRateを下回る場合は調整 (0人Tierなどで発生しうる)
            if (maxRate < minRate && tierPlayerCount === 0) {
                 maxRate = minRate; // レート帯として成立させる
            } else if (maxRate < minRate && tierPlayerCount > 0) {
                // 人数がいるのにmaxRateがminRateを下回るのはおかしいので、仮にminRateより少し上を設定
                maxRate = minRate + 100; 
            }

            combinedTierInfo.push({
                name: tier.name,
                minRate: minRate,
                maxRate: maxRate,
                startRank: tierStartRank,
                endRank: tierEndRank,
                playerCount: tierPlayerCount
            });
            currentRankCumulative = tierEndRank;
            sumOfAllocatedPlayers += tierPlayerCount;
        }

        let remainingPlayersForBronze = totalPlayers - sumOfAllocatedPlayers;

        let bronze1Count = 0;
        let bronze2Count = 0;
        let bronze3Count = 0;

        if (remainingPlayersForBronze > 0) {
            if (remainingPlayersForBronze >= 3) {
                const baseBronzePlayerCount = Math.floor(remainingPlayersForBronze / 3);
                bronze1Count = baseBronzePlayerCount;
                bronze2Count = baseBronzePlayerCount;
                bronze3Count = remainingPlayersForBronze - bronze1Count - bronze2Count;
                
                bronze1Count = Math.max(1, bronze1Count);
                bronze2Count = Math.max(1, bronze2Count);
                bronze3Count = Math.max(1, bronze3Count);

            } else {
                bronze3Count = remainingPlayersForBronze;
                bronze1Count = 0;
                bronze2Count = 0;
            }
        }
        
        bronze1Count = Math.max(0, bronze1Count);
        bronze2Count = Math.max(0, bronze2Count);
        bronze3Count = Math.max(0, bronze3Count);

        const bronze1Tier = TIER_DATA[bronze1Index];
        combinedTierInfo.push({
            name: bronze1Tier.name,
            minRate: currentTierRates[bronze1Tier.name],
            maxRate: currentTierRates[orderedTierNames[silver3Index]] - 1,
            startRank: currentRankCumulative + 1,
            endRank: currentRankCumulative + bronze1Count,
            playerCount: bronze1Count
        });
        currentRankCumulative += bronze1Count;
        sumOfAllocatedPlayers += bronze1Count;

        const bronze2Tier = TIER_DATA[bronze2Index];
        combinedTierInfo.push({
            name: bronze2Tier.name,
            minRate: currentTierRates[bronze2Tier.name],
            maxRate: currentTierRates[orderedTierNames[bronze1Index]] - 1,
            startRank: currentRankCumulative + 1,
            endRank: currentRankCumulative + bronze2Count,
            playerCount: bronze2Count
        });
        currentRankCumulative += bronze2Count;
        sumOfAllocatedPlayers += bronze2Count;

        const bronze3Tier = TIER_DATA[bronze3Index];
        combinedTierInfo.push({
            name: bronze3Tier.name,
            minRate: currentTierRates[bronze3Tier.name],
            maxRate: currentTierRates[orderedTierNames[bronze2Index]] - 1,
            startRank: currentRankCumulative + 1,
            endRank: totalPlayers, // ブロンズ3の endRank は常に totalPlayers
            playerCount: bronze3Count
        });
        currentRankCumulative = totalPlayers;
        sumOfAllocatedPlayers += bronze3Count;


        // --- Helper: 特定の順位範囲の平均レートを計算 ---
        function getAverageRateForRankRange(startRank, endRank, combinedTierInfo, currentTierRates, totalPlayers) {
            // 順位範囲をクランプ
            startRank = Math.max(1, startRank);
            endRank = Math.min(totalPlayers, endRank);

            if (startRank > endRank) {
                return null; // 無効な順位範囲
            }

            let totalWeightedRate = 0;
            let totalRanksCovered = 0;

            for (const tier of combinedTierInfo) {
                // Tierのレート帯の平均値を計算 (maxRateの例外処理を含む)
                let tierMaxRate = tier.maxRate;
                if (tier.name === 'フロンティア マスター') {
                    tierMaxRate = currentTierRates['フロンティア マスター1位'];
                } else if (tier.name === 'ブロンズ 3') {
                    // ブロンズ3のmaxRateは通常tier.maxRateで既にブロンズ2-1となっているはずだが念のため
                    tierMaxRate = currentTierRates['ブロンズ 2'] !== undefined ? currentTierRates['ブロンズ 2'] - 1 : tier.minRate + 100;
                    if (tierMaxRate < tier.minRate) tierMaxRate = tier.minRate + 1; // 少なくとも1は広げる
                }

                // Tierの平均レート
                const tierAvgRate = (tier.minRate + tierMaxRate) / 2;

                // 相手の順位範囲とTierの順位範囲の重なりを計算
                const overlapStart = Math.max(startRank, tier.startRank);
                const overlapEnd = Math.min(endRank, tier.endRank);

                if (overlapStart <= overlapEnd) {
                    const ranksInOverlap = overlapEnd - overlapStart + 1;
                    totalWeightedRate += tierAvgRate * ranksInOverlap;
                    totalRanksCovered += ranksInOverlap;
                }
            }

            if (totalRanksCovered > 0) {
                return totalWeightedRate / totalRanksCovered;
            }
            return null; // 重なるTierがない場合
        }

        // --- 3. 詳細レート変動量の計算 ---
        // 相手のレートを順位差から算出
        const opponentRates = {};
        const rankDiffRanges = {
            muchHigher: { start: -30, end: -21 }, // -30位 ~ -21位 (例: 自分の順位が100位なら、相手は70位~79位)
            slightlyHigher: { start: -20, end: -11 },
            equal: { start: -5, end: 5 }, // 0位差を中心とした10人
            slightlyLower: { start: 11, end: 20 },
            muchLower: { start: 21, end: 30 }
        };

        for (const category in rankDiffRanges) {
            const range = rankDiffRanges[category];
            const startOpponentRank = myRank + range.start;
            const endOpponentRank = myRank + range.end;

            const avgOpponentRate = getAverageRateForRankRange(startOpponentRank, endOpponentRank, combinedTierInfo, currentTierRates, totalPlayers);
            
            opponentRates[category] = avgOpponentRate !== null ? avgOpponentRate : currentRate; // 計算できない場合は自分のレートを使用
        }

        const detailedRateChanges = {};
        for (const category in opponentRates) {
            const opponentRate = opponentRates[category];
            
            // 勝利時
            let gain = 16 + (opponentRate - currentRate) * 0.04;
            gain = Math.max(1, gain); // 最低1ポイント獲得

            // 敗北時
            let loss = -(16 + (currentRate - opponentRate) * 0.04);
            loss = Math.min(-1, loss); // 最低-1ポイント喪失

            detailedRateChanges[category] = { gain: gain, loss: loss };
        }

        // --- 4. 100戦後のレート期待値と必要勝利数の計算 ---
        let expectedRate100Matches = currentRate;
        const categories = Object.keys(winRateVs);
        let sumAvgRateChangePerMatch = 0;

        categories.forEach(category => {
            const winProb = winRateVs[category];
            const lossProb = 1 - winProb;
            // 詳細レート変動量から平均レート変化を計算
            const avgRateChangePerMatch = (detailedRateChanges[category].gain * winProb) + (detailedRateChanges[category].loss * lossProb);
            sumAvgRateChangePerMatch += avgRateChangePerMatch;
        });

        // 全カテゴリの平均値で100戦後の期待値を計算
        expectedRate100Matches += (sumAvgRateChangePerMatch / categories.length) * 100;


        let neededWinsForTarget = '計算不能';
        const targetRate = currentRate + targetRateIncrease;
        
        // 目標レート増加量がある場合のみ計算
        if (targetRateIncrease > 0) {
            // 現在レートから目標レートまでの差を、平均レート変動量で割る
            const overallAvgRateChangePerMatch = sumAvgRateChangePerMatch / categories.length;
            if (overallAvgRateChangePerMatch > 0) { // レートが上昇する場合のみ
                neededWinsForTarget = Math.ceil(targetRateIncrease / overallAvgRateChangePerMatch);
            } else {
                neededWinsForTarget = '目標レートは達成困難';
            }
        } else {
            neededWinsForTarget = 0;
        }

        // --- 5. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        neededWinsForTargetDisplay.textContent = neededWinsForTarget;

        // 現在のTierを表示
        let currentTierName = '不明';
        for (const tier of combinedTierInfo) {
            // マスターは minRate 以上
            if (tier.name === 'フロンティア マスター' && currentRate >= tier.minRate) {
                currentTierName = tier.name;
                break;
            }
            // その他のTierは minRate 以上、maxRate 以下
            // maxRateは「そのTierより一つ上のTierの最低レートより1低いレート」として計算されている
            else if (currentRate >= tier.minRate && currentRate <= tier.maxRate) {
                currentTierName = tier.name;
                break;
            }
            // ブロンズ3はminRate以上（下限なし）
            else if (tier.name === 'ブロンズ 3' && currentRate >= tier.minRate) {
                currentTierName = tier.name;
                break;
            }
        }
        currentTierDisplay.textContent = currentTierName;


        // 詳細レート変動量テーブルの表示
        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain.toFixed(1)}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss.toFixed(1)}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain.toFixed(1)}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss.toFixed(1)}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain.toFixed(1)}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss.toFixed(1)}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain.toFixed(1)}`;
        lossSlightlyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss.toFixed(1)}`;
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain.toFixed(1)}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss.toFixed(1)}`;

        // Tierと推定レート帯の目安の表示
        tierRateTableBody.innerHTML = ''; // テーブルをクリア

        combinedTierInfo.forEach(tier => {
            const row = tierRateTableBody.insertRow();
            const rankCell = row.insertCell();
            const nameCell = row.insertCell();
            const rateCell = row.insertCell();
            const playerCountCell = row.insertCell();

            rankCell.textContent = `${tier.startRank}位 ~ ${tier.endRank}位`;
            nameCell.textContent = tier.name;

            let maxRateText;
            if (tier.name === 'フロンティア マスター') {
                maxRateText = tier.maxRate;
            } else if (tier.name === 'ブロンズ 3') {
                // ブロンズ3のmaxRateは計算上の上限、表示は「下限なし」ではない
                // maxRateTextは「ブロンズ2の最低レート - 1」
                maxRateText = tier.maxRate; // 例: 1490
            } else {
                maxRateText = Math.round(tier.maxRate);
            }

            const minRateText = Math.round(tier.minRate);

            // 表示調整: 人数が0の場合やレート帯が不整合な場合
            if (tier.playerCount === 0 || minRateText > maxRateText) {
                rateCell.textContent = '-'; // ハイフン表示
            } else if (tier.name === 'フロンティア マスター') {
                rateCell.textContent = `${minRateText} ~ ${maxRateText}`;
            } else if (tier.name === 'ブロンズ 3') {
                 rateCell.textContent = `${minRateText} ~ ${maxRateText}`;
            }
            else {
                rateCell.textContent = `${minRateText} ~ ${maxRateText}`;
            }
            playerCountCell.textContent = `${tier.playerCount}人`;
        });
    }

    // --- イベントリスナーの設定 ---
    // すべての入力フィールドで変更があったら計算を実行
    [
        winsInput, lossesInput, currentRateInput, myRankInput, targetRateIncreaseInput, totalPlayersInput,
        winRateVsMuchHigherInput, winRateVsSlightlyHigherInput, winRateVsEqualInput,
        winRateVsSlightlyLowerInput, winRateVsMuchLowerInput
    ].forEach(input => {
        input.addEventListener('input', calculateLadderStats);
    });

    // Tier境界レートの入力フィールドにもイベントリスナーを設定
    for (const tierKey in tierRateInputs) {
        tierRateInputs[tierKey].addEventListener('input', calculateLadderStats);
    }

    calculateButton.addEventListener('click', calculateLadderStats);

    // 初期表示のために一度計算を実行
    calculateLadderStats();
});
