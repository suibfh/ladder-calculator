document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');
    const totalPlayersInput = document.getElementById('totalPlayers');

    // Tier境界レート入力用divはHTMLに直接記述されたため、ここでは取得しない
    // const tierRateBoundariesDiv = document.getElementById('tierRateBoundaries'); 

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
    const lossSlightlyLowerCalculated = document.getElementById('lossSlightlyLowerCalculated'); // 誤字修正
    const gainMuchLowerCalculated = document.getElementById('gainMuchLowerCalculated');
    const lossMuchLowerCalculated = document.getElementById('lossMuchLowerCalculated');

    // Tierと推定レート帯の目安テーブル要素
    const tierRateTableBody = document.querySelector('#tierRateTable tbody');

    // --- Tierデータ構造 ---
    // percentageは公式から提供された概算値を使用
    // ブロンズのpercentageは計算ロジック内で動的に割り振るため、ここでは0とする
    const TIER_DATA = [
        { name: 'フロンティア マスター', percentage: 0.01 },     // 1%
        { name: 'フロンティア ダイヤモンド', percentage: 0.04 },  // 4%
        { name: 'フロンティア プラチナ', percentage: 0.05 },     // 5%
        { name: 'ゴールド 1', percentage: 0.0667 },             // 6.67%
        { name: 'ゴールド 2', percentage: 0.0667 },             // 6.67%
        { name: 'ゴールド 3', percentage: 0.0667 },             // 6.67%
        { name: 'シルバー 1', percentage: 0.10 },               // 10%
        { name: 'シルバー 2', percentage: 0.10 },               // 10%
        { name: 'シルバー 3', percentage: 0.10 },               // 10%
        { name: 'ブロンズ 1', percentage: 0 },                  // dynamically calculated
        { name: 'ブロンズ 2', percentage: 0 },                  // dynamically calculated
        { name: 'ブロンズ 3', percentage: 0 }                   // dynamically calculated (absorbs remainder)
    ];

    // --- Tier境界レートの初期設定とDOM要素の取得 ---
    const defaultTierRates = {
        'フロンティア マスター1位': 3664, // マスターTierの最高レート（1位の人のレート）
        'フロンティア マスター': 3062,   // マスターTierの最低レート（ダイヤとの境界）
        'フロンティア ダイヤモンド': 2757, // ダイヤTierの最低レート
        'フロンティア プラチナ': 2637,
        'ゴールド 1': 2352,
        'ゴールド 2': 2190,
        'ゴールド 3': 2094,
        'シルバー 1': 1876,
        'シルバー 2': 1749,
        'シルバー 3': 1670,
        'ブロンズ 1': 1578,
        'ブロンズ 2': 1491,
        'ブロンズ 3': 1029 // ブロンズ3の最低レート
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
        // --- 1. 入力値の取得とバリデーション ---
        const wins = parseInt(winsInput.value) || 0;
        const losses = parseInt(lossesInput.value) || 0;
        const currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value) || 0;
        const totalPlayers = parseInt(totalPlayersInput.value); // ランクマッチの参加人数

        // Tier境界レートを更新（ユーザー入力値があればそれを優先）
        const currentTierRates = {};
        for (const tierKey in tierRateInputs) {
            const inputElement = tierRateInputs[tierKey];
            const rate = parseFloat(inputElement.value);
            currentTierRates[tierKey] = isNaN(rate) ? defaultTierRates[tierKey] : rate;
        }

        const winRateVs = {
            muchHigher: parseFloat(winRateVsMuchHigherInput.value) / 100 || 0.5,
            slightlyHigher: parseFloat(winRateVsSlightlyHigherInput.value) / 100 || 0.5,
            equal: parseFloat(winRateVsEqualInput.value) / 100 || 0.5,
            slightlyLower: parseFloat(winRateVsSlightlyLowerInput.value) / 100 || 0.5,
            muchLower: parseFloat(winRateVsMuchLowerInput.value) / 100 || 0.5
        };

        // 必須入力のバリデーション
        if (isNaN(currentRate) || currentRate < 0) {
            alert('現在のレートを正しく入力してください。');
            currentRateInput.focus();
            return;
        }
        if (isNaN(totalPlayers) || totalPlayers < 1) { // 参加人数は1以上
            alert('ランクマッチの参加人数を正しく入力してください（1以上の数値）。');
            totalPlayersInput.focus();
            return;
        }

        const totalMatches = wins + losses;
        const currentWinRate = totalMatches === 0 ? 0 : (wins / totalMatches) * 100;

        // --- 2. レート変動量の計算 ---
        // 基本レート変動量 (仮の計算ロジック)
        const baseRateChangePerWin = 30; // 暫定値、ゲームによる
        const baseRateChangePerLoss = -20; // 暫定値、ゲームによる

        // 目標レート
        // const targetRate = currentRate + targetRateIncrease; // 今回は使用しないが念のためコメントアウト

        // 相手レート差による補正 (仮の計算ロジック)
        const rateDiffFactor = {
            muchHigher: 1.5,    // かなり高い相手には多く増減
            slightlyHigher: 1.2, // やや高い相手には多く増減
            equal: 1.0,         // 同等
            slightlyLower: 0.8, // やや低い相手には少なく増減
            muchLower: 0.5      // かなり低い相手には少なく増減
        };

        const detailedRateChanges = {};
        for (const category in rateDiffFactor) {
            const factor = rateDiffFactor[category];
            const gain = baseRateChangePerWin * factor;
            let loss = baseRateChangePerLoss * factor;
            
            // 敗北時のレート減少は最低-1を保証する
            loss = Math.ceil(Math.abs(loss)) * -1; // 例: -1.2 -> -2, -0.5 -> -1

            detailedRateChanges[category] = { gain: gain, loss: loss };
        }

        // --- 3. 100戦後のレート期待値と必要勝利数の計算 ---
        let expectedRate100Matches = currentRate;
        for (const category in winRateVs) {
            const winProb = winRateVs[category];
            const lossProb = 1 - winProb;
            const avgRateChangePerMatch = (detailedRateChanges[category].gain * winProb) + (detailedRateChanges[category].loss * lossProb);
            expectedRate100Matches += (avgRateChangePerMatch * 100) / Object.keys(winRateVs).length; // 各カテゴリが均等に発生すると仮定
        }

        // 目標レート達成までの必要勝利数 (簡略化された計算)
        // 平均的なレート変動量を仮定
        const avgExpectedRateChangePerMatch = expectedRate100Matches > currentRate ?
            (expectedRate100Matches - currentRate) / 100 : // 期待値が上がる場合
            (detailedRateChanges.equal.gain * winRateVs.equal + detailedRateChanges.equal.loss * (1 - winRateVs.equal)); // 期待値が上がらない場合、同等相手での変動で計算

        let neededWinsForTarget = '計算不能';
        if (targetRateIncrease > 0 && avgExpectedRateChangePerMatch > 0) {
            neededWinsForTarget = Math.ceil(targetRateIncrease / avgExpectedRateChangePerMatch);
        } else if (targetRateIncrease <= 0) {
            neededWinsForTarget = 0; // 目標増加量が0以下なら0勝
        }
        neededWinsForTargetDisplay.textContent = neededWinsForTarget;


        // --- 4. Tierと推定レート帯の目安の計算 ---
        const combinedTierInfo = [];
        let currentRankCumulative = 0;
        let sumOfAllocatedPlayers = 0; // これまでに割り当てられたプレイヤーの合計

        // TierDataのインデックスを名前で取得
        const silver3Index = TIER_DATA.findIndex(tier => tier.name === 'シルバー 3');
        const bronze1Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 1');
        const bronze2Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 2');
        const bronze3Index = TIER_DATA.findIndex(tier => tier.name === 'ブロンズ 3');

        // Tier名の順序リストを生成 (レート帯の境界計算に使用)
        const orderedTierNames = TIER_DATA.map(tier => tier.name);


        // --- マスターからシルバー3までのTierを処理 ---
        for (let i = 0; i <= silver3Index; i++) {
            const tier = TIER_DATA[i];
            let tierPlayerCount = Math.floor(totalPlayers * tier.percentage); // パーセンテージに基づく計算値

            // 残り人数が0になったら、これ以降のTierは全て0人
            if (totalPlayers - sumOfAllocatedPlayers <= 0) {
                tierPlayerCount = 0;
            } else {
                // "Tierの計算結果が0人になったとしても、基本的には最低1人を確保する" ルール適用
                // ただし、残りの人数を超えない範囲で
                if (tierPlayerCount === 0 && tier.percentage > 0) { // 計算結果が0でも、元々パーセンテージが設定されていれば
                    tierPlayerCount = 1;
                }
                // 残りの人数を超えることはできない
                tierPlayerCount = Math.min(tierPlayerCount, totalPlayers - sumOfAllocatedPlayers);
            }

            // 最終的な人数が負の値にならないように
            tierPlayerCount = Math.max(0, tierPlayerCount);


            const tierStartRank = currentRankCumulative + 1;
            const tierEndRank = currentRankCumulative + tierPlayerCount;

            // Tierの推定レート帯を計算
            let minRate = currentTierRates[tier.name];
            let maxRate;

            if (tier.name === 'フロンティア マスター') {
                minRate = currentTierRates['フロンティア マスター']; // マスターの最低レート
                maxRate = currentTierRates['フロンティア マスター1位']; // マスター1位のレートが最高レート
            } else {
                maxRate = currentTierRates[orderedTierNames[i - 1]] - 1; // 1つ上のTierの最低レート - 1
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

        // --- ブロンズTierの処理 ---
        let remainingPlayersForBronze = totalPlayers - sumOfAllocatedPlayers;

        let bronze1Count = 0;
        let bronze2Count = 0;
        let bronze3Count = 0;

        if (remainingPlayersForBronze > 0) {
            if (remainingPlayersForBronze >= 3) {
                // 通常の3分割
                const baseBronzePlayerCount = Math.floor(remainingPlayersForBronze / 3);
                bronze1Count = baseBronzePlayerCount;
                bronze2Count = baseBronzePlayerCount;
                bronze3Count = remainingPlayersForBronze - bronze1Count - bronze2Count;
                
                // それぞれ最低1人確保 (通常ケースでは適用されるはず)
                bronze1Count = Math.max(1, bronze1Count);
                bronze2Count = Math.max(1, bronze2Count);
                bronze3Count = Math.max(1, bronze3Count);

            } else { // remainingPlayersForBronze が 1 または 2 の場合
                // 「上から人数を埋めていってブロンズ3側が0にしよう」ルールに合わせ、ブロンズ3が残りを全て吸収
                bronze3Count = remainingPlayersForBronze;
                bronze1Count = 0; // ブロンズ1, 2は0人
                bronze2Count = 0;
            }
        }
        
        // 最終的な人数が負の値にならないように
        bronze1Count = Math.max(0, bronze1Count);
        bronze2Count = Math.max(0, bronze2Count);
        bronze3Count = Math.max(0, bronze3Count);


        // ブロンズ1の追加
        const bronze1Tier = TIER_DATA[bronze1Index];
        combinedTierInfo.push({
            name: bronze1Tier.name,
            minRate: currentTierRates[bronze1Tier.name],
            maxRate: currentTierRates[orderedTierNames[silver3Index]] - 1, // シルバー3の最低レート - 1
            startRank: currentRankCumulative + 1,
            endRank: currentRankCumulative + bronze1Count,
            playerCount: bronze1Count
        });
        currentRankCumulative += bronze1Count;
        sumOfAllocatedPlayers += bronze1Count; // For debug, should be totalPlayers at the end

        // ブロンズ2の追加
        const bronze2Tier = TIER_DATA[bronze2Index];
        combinedTierInfo.push({
            name: bronze2Tier.name,
            minRate: currentTierRates[bronze2Tier.name],
            maxRate: currentTierRates[orderedTierNames[bronze1Index]] - 1, // ブロンズ1の最低レート - 1
            startRank: currentRankCumulative + 1,
            endRank: currentRankCumulative + bronze2Count,
            playerCount: bronze2Count
        });
        currentRankCumulative += bronze2Count;
        sumOfAllocatedPlayers += bronze2Count;

        // ブロンズ3の追加
        const bronze3Tier = TIER_DATA[bronze3Index];
        combinedTierInfo.push({
            name: bronze3Tier.name,
            minRate: currentTierRates[bronze3Tier.name],
            maxRate: currentTierRates[orderedTierNames[bronze2Index]] - 1, // ブロンズ2の最低レート - 1
            startRank: currentRankCumulative + 1,
            // ブロンズ3の endRank は常に totalPlayers となるべき
            endRank: totalPlayers,
            playerCount: bronze3Count
        });
        currentRankCumulative = totalPlayers; // 全てのプレイヤーを考慮済み
        sumOfAllocatedPlayers += bronze3Count;


        // --- Tierと推定レート帯の目安の表示 ---
        tierRateTableBody.innerHTML = ''; // テーブルをクリア

        combinedTierInfo.forEach(tier => {
            const row = tierRateTableBody.insertRow();
            const rankCell = row.insertCell();
            const nameCell = row.insertCell(); // Tier名セルを追加
            const rateCell = row.insertCell();
            const playerCountCell = row.insertCell(); // 人数表示セルを追加

            rankCell.textContent = `${tier.startRank}位 ~ ${tier.endRank}位`;
            nameCell.textContent = tier.name; // Tier名を表示

            let maxRateText;
            if (tier.name === 'フロンティア マスター') {
                maxRateText = tier.maxRate; // マスターは「最高レート」として直接設定された値
            } else if (tier.name === 'ブロンズ 3') {
                maxRateText = '下限なし'; // ブロンズ3は下限なし
            } else {
                maxRateText = Math.round(tier.maxRate); // 計算された値
            }

            const minRateText = Math.round(tier.minRate);

            if (tier.name === 'フロンティア マスター') {
                rateCell.textContent = `${minRateText} ~ ${maxRateText}`;
            } else if (tier.name === 'ブロンズ 3') {
                rateCell.textContent = `${minRateText} ~ ${maxRateText}`;
            } else {
                // 上限レートが下限レートを下回る（例: 0人Tierでレート帯が意味をなさない）場合は表示を調整
                if (tier.playerCount === 0 || minRateText > maxRateText) {
                    rateCell.textContent = '-'; // 人数が0の場合やレート帯が不整合な場合はハイフン
                } else {
                    rateCell.textContent = `${minRateText} ~ ${maxRateText}`;
                }
            }
            playerCountCell.textContent = `${tier.playerCount}人`;
        });


        // --- 4. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        // neededWinsForTargetDisplay は上記で設定済み

        // 詳細レート変動量テーブルの表示
        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain.toFixed(1)}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss.toFixed(1)}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain.toFixed(1)}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss.toFixed(1)}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain.toFixed(1)}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss.toFixed(1)}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain.toFixed(1)}`;
        lossSlightlyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss.toFixed(1)}`; // 誤字修正済み
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain.toFixed(1)}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss.toFixed(1)}`;
    }

    // --- イベントリスナーの設定 ---
    // すべての入力フィールドで変更があったら計算を実行
    [
        winsInput, lossesInput, currentRateInput, targetRateIncreaseInput, totalPlayersInput,
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
