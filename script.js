document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const winsInput = document.getElementById('wins');
    const lossesInput = document.getElementById('losses');
    const currentRateInput = document.getElementById('currentRate');
    const targetRateIncreaseInput = document.getElementById('targetRateIncrease');
    const totalPlayersInput = document.getElementById('totalPlayers'); // ランクマッチの参加人数

    const tierRateBoundariesDiv = document.getElementById('tierRateBoundaries'); // Tier境界レート入力用div

    const winRateVsMuchHigherInput = document.getElementById('winRateVsMuchHigher'); // かなりレートが高い相手への勝率
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

    // --- 初期値設定 ---
    winsInput.value = 100;
    lossesInput.value = 70;
    currentRateInput.value = 2059;
    targetRateIncreaseInput.value = 200;
    totalPlayersInput.value = 250;

    winRateVsMuchHigherInput.value = 30;
    winRateVsSlightlyHigherInput.value = 50;
    winRateVsEqualInput.value = 70;
    winRateVsSlightlyLowerInput.value = 70;
    winRateVsMuchLowerInput.value = 80;

    // Tierデータ（Tier名と割合）
    const TIER_DATA = [
        // percentageは公式情報に基づき修正 (13.36% -> 13.30%)
        { name: 'フロンティア マスター', percentage: 0.1330 },
        { name: 'フロンティア ダイヤモンド', percentage: 0.1330 },
        { name: 'フロンティア プラチナ', percentage: 0.1330 },
        { name: 'ゴールド 1', percentage: 0.0833 },
        { name: 'ゴールド 2', percentage: 0.0833 },
        { name: 'ゴールド 3', percentage: 0.0833 },
        { name: 'シルバー 1', percentage: 0.0833 },
        { name: 'シルバー 2', percentage: 0.0833 },
        { name: 'シルバー 3', percentage: 0.0833 },
        { name: 'ブロンズ 1', percentage: 0.0833 },
        { name: 'ブロンズ 2', percentage: 0.0833 },
        { name: 'ブロンズ 3', percentage: 0.0833 }
    ];

    // Tier境界レートの初期値 (デバッグ用。Tierデータと一致させるため12個)
    const initialTierRates = {
        // 3500はフロンティアマスターの1位のレート、3062はフロンティアマスターの最低レート（かつフロンティアダイヤモンドの最高レート）
        'フロンティア マスター': 3062, // マスターの最低レート
        'フロンティア ダイヤモンド': 2733,
        'フロンティア プラチナ': 2628,
        'ゴールド 1': 2369,
        'ゴールド 2': 2181,
        'ゴールド 3': 2074,
        'シルバー 1': 1870,
        'シルバー 2': 1745,
        'シルバー 3': 1659,
        'ブロンズ 1': 1579,
        'ブロンズ 2': 1491, // 新たに追加された境界レート
        'ブロンズ 3': 1029
    };

    // --- 関数定義 ---
    // Tier境界レートの入力欄を動的に生成
    function generateTierRateInputs() {
        tierRateBoundariesDiv.innerHTML = ''; // 既存の入力欄をクリア

        TIER_DATA.forEach(tier => {
            const div = document.createElement('div');
            div.className = 'input-group-inline';
            div.innerHTML = `
                <label for="tierRate_${tier.name}">${tier.name} 最低レート:</label>
                <input type="number" id="tierRate_${tier.name}" value="" min="0">
            `;
            tierRateBoundariesDiv.appendChild(div);
            // 初期値を設定
            document.getElementById(`tierRate_${tier.name}`).value = initialTierRates[tier.name] !== undefined ? initialTierRates[tier.name] : '';
        });
        // フロンティアマスターの最高レート入力欄を別途追加（1位のレートとして）
        const fmMaxRateDiv = document.createElement('div');
        fmMaxRateDiv.className = 'input-group-inline';
        fmMaxRateDiv.innerHTML = `
            <label for="tierRate_フロンティア マスター_最高">フロンティア マスター (1位レート):</label>
            <input type="number" id="tierRate_フロンティア マスター_最高" value="3500" min="0">
        `;
        tierRateBoundariesDiv.insertBefore(fmMaxRateDiv, tierRateBoundariesDiv.firstChild); // 先頭に追加
    }

    // 計算実行関数
    function calculateLadderStats() {
        // --- 1. 入力値の取得 ---
        const wins = parseFloat(winsInput.value);
        const losses = parseFloat(lossesInput.value);
        const currentRate = parseFloat(currentRateInput.value);
        const targetRateIncrease = parseFloat(targetRateIncreaseInput.value);
        const totalPlayers = parseFloat(totalPlayersInput.value);

        const tierRateInputs = {};
        // Tier境界レートの必須入力チェック
        let allTierRatesFilled = true;

        // まずはフロンティアマスターの最高レートを取得
        const fmMaxRateInput = document.getElementById('tierRate_フロンティア マスター_最高');
        const fmMaxRate = parseFloat(fmMaxRateInput.value);
        if (isNaN(fmMaxRate)) {
            allTierRatesFilled = false;
        }
        tierRateInputs['フロンティア マスター_最高'] = fmMaxRate;


        TIER_DATA.forEach(tier => {
            const inputElement = document.getElementById(`tierRate_${tier.name}`);
            const rateValue = parseFloat(inputElement.value);
            if (isNaN(rateValue)) {
                allTierRatesFilled = false;
            }
            tierRateInputs[tier.name] = rateValue;
        });

        if (!allTierRatesFilled) {
            alert('Tierの境界レート設定はすべて入力必須です。');
            return; // 処理を中断
        }

        // 入力値の検証
        if (isNaN(wins) || isNaN(losses) || isNaN(currentRate) || isNaN(targetRateIncrease) || isNaN(totalPlayers) || totalPlayers <= 0) {
            alert('すべての入力項目に適切な数値を入力してください。');
            return;
        }
        
        // 勝率入力値のパースと格納
        const parsedWinRates = {
            muchHigher: parseFloat(winRateVsMuchHigherInput.value) / 100,
            slightlyHigher: parseFloat(winRateVsSlightlyHigherInput.value) / 100,
            equal: parseFloat(winRateVsEqualInput.value) / 100,
            slightlyLower: parseFloat(winRateVsSlightlyLowerInput.value) / 100,
            muchLower: parseFloat(winRateVsMuchLowerInput.value) / 100
        };


        // --- 2. 基本的な計算 ---
        const totalMatches = wins + losses;
        const currentWinRate = (wins / totalMatches) * 100;

        // --- 3. 100戦後のレート期待値と目標レート達成までの必要勝利数 ---
        // 各相手レートとの差ごとのレート変動量を計算
        const rateDifferences = {
            muchHigher: 300, // かなりレートが高い (例: +300)
            slightlyHigher: 100, // ややレートが高い (例: +100)
            equal: 0, // 同等
            slightlyLower: -100, // ややレートが低い (例: -100)
            muchLower: -300 // かなりレートが低い (例: -300)
        };

        let totalExpectedRateChangePerMatch = 0;
        const detailedRateChanges = {};

        for (const category in rateDifferences) {
            const rateDifference = rateDifferences[category];
            const winRate = parsedWinRates[category]; // 修正: evalを使わず、直接オブジェクトから取得
            const opponentRate = currentRate + rateDifference; // 相手のレート

            // レート計算式: 16 + (相手のレート - 自分のレート) * 0.04
            let gain = 16 + (opponentRate - currentRate) * 0.04; // 勝利時
            if (gain < 1) gain = 1; // 最低増加量を1とする

            // 敗北時計算式: -(16 + (自分のレート - 相手のレート) * 0.04) * ランクマッチ全体の勝利数/ランクマッチ全体の敗北数
            // ランクマッチ全体の勝利数/ランクマッチ全体の敗北数はプレイヤーが確認できないため、1.0で固定
            let loss = -(16 + (currentRate - opponentRate) * 0.04) * 1.0; 
            if (loss > -1) loss = -1; // 最低減少量を-1とする
            
            detailedRateChanges[category] = { gain: gain.toFixed(1), loss: loss.toFixed(1) };

            // 期待レート変化量の計算
            totalExpectedRateChangePerMatch += (gain * winRate) + (loss * (1 - winRate));
        }

        const expectedRate100Matches = currentRate + (totalExpectedRateChangePerMatch * 100);

        // 目標レート達成までの必要勝利数
        const targetRate = currentRate + targetRateIncrease;
        let neededWinsForTarget = 0;
        if (totalExpectedRateChangePerMatch > 0) {
            neededWinsForTarget = Math.ceil(targetRateIncrease / totalExpectedRateChangePerMatch);
        } else {
            neededWinsForTarget = 'レート増加は難しいかもしれません';
        }

        // --- 4. 詳細レート変動量テーブルの表示 ---
        gainMuchHigherCalculated.textContent = `+${detailedRateChanges.muchHigher.gain}`;
        lossMuchHigherCalculated.textContent = `${detailedRateChanges.muchHigher.loss}`;
        gainSlightlyHigherCalculated.textContent = `+${detailedRateChanges.slightlyHigher.gain}`;
        lossSlightlyHigherCalculated.textContent = `${detailedRateChanges.slightlyHigher.loss}`;
        gainEqualCalculated.textContent = `+${detailedRateChanges.equal.gain}`;
        lossEqualCalculated.textContent = `${detailedRateChanges.equal.loss}`;
        gainSlightlyLowerCalculated.textContent = `+${detailedRateChanges.slightlyLower.gain}`;
        lossSlightlyLowerCalculated.textContent = `${detailedRateChanges.slightlyLower.loss}`; // 誤字修正
        gainMuchLowerCalculated.textContent = `+${detailedRateChanges.muchLower.gain}`;
        lossMuchLowerCalculated.textContent = `${detailedRateChanges.muchLower.loss}`;


        // --- 5. 結果の表示 ---
        totalMatchesDisplay.textContent = totalMatches;
        currentWinRateDisplay.textContent = `${currentWinRate.toFixed(1)}%`;
        expectedRate100MatchesDisplay.textContent = Math.round(expectedRate100Matches);
        neededWinsForTargetDisplay.textContent = neededWinsForTarget;

        // --- 6. Tierと推定レート帯の目安の表示 ---
        const tierRateTableBody = document.querySelector('#tierRateTable tbody');
        tierRateTableBody.innerHTML = ''; // 既存の行をクリア
        
        let currentRankStart = 1; // 順位範囲の開始
        // previousTierMinRateはフロンティアマスターの最低レート（かつダイヤモンドの最高レート）
        // そのため、フロンティアマスターのレート帯は「フロンティアマスターの最低レート 〜 フロンティアマスターの最高レート」と表示

        // フロンティアマスター (最上位Tierの処理)
        const fmTier = TIER_DATA.find(tier => tier.name === 'フロンティア マスター');
        if (fmTier) {
            const fmMaxRate = tierRateInputs['フロンティア マスター_最高']; // フロンティアマスターの最高レートは入力値から取得 (3500)
            const fmMinRate = tierRateInputs['フロンティア マスター']; // フロンティアマスターの最低レートは入力値から取得 (3062)
            const fmRankLimit = Math.ceil(totalPlayers * fmTier.percentage); // フロンティアマスターの順位範囲
            
            const row = tierRateTableBody.insertRow();
            row.insertCell().textContent = fmTier.name;
            row.insertCell().textContent = `${fmMinRate} 〜 ${fmMaxRate}`;
            row.insertCell().textContent = `${currentRankStart} 〜 ${fmRankLimit}`;
            currentRankStart = fmRankLimit + 1; // 次のTierの順位範囲開始を更新
        }

        // その他のTierの処理 (フロンティアマスターはすでに処理済みなのでスキップ)
        // 配列を逆順に回して、一つ上のTierの最低レートを次のTierの最高レートとして利用できるようにする
        // ブロンズ3からフロンティアプラチナまでを想定
        for (let i = TIER_DATA.length - 1; i >= 0; i--) {
            const tier = TIER_DATA[i];

            // フロンティアマスターはすでに処理済みなのでスキップ
            if (tier.name === 'フロンティア マスター') {
                continue;
            }

            const rankLimit = Math.ceil(totalPlayers * tier.percentage);
            const currentTierMinRate = tierRateInputs[tier.name];

            // 次のTierの最高レートは、現在のTierの次のTierの最低レート - 1
            // または、フロンティアマスターの場合、フロンティアマスターの最低レート - 1
            let estimatedRateMax;
            const nextTierIndex = TIER_DATA.findIndex(t => t.name === tier.name) -1; // TIER_DATA はマスターが0番目
            if (nextTierIndex >= 0) {
                 const nextTier = TIER_DATA[nextTierIndex];
                 if (nextTier.name === 'フロンティア マスター') {
                     estimatedRateMax = tierRateInputs['フロンティア マスター']; // フロンティアマスターの最低レート
                 } else {
                     estimatedRateMax = tierRateInputs[nextTier.name];
                 }
            } else {
                // ここには到達しないはず (ブロンズ3から上に向かっているため)
                estimatedRateMax = Infinity;
            }
            estimatedRateMax -= 1; // 境界レートは含まず

            const row = tierRateTableBody.insertRow();
            row.insertCell().textContent = tier.name;
            row.insertCell().textContent = `${currentTierMinRate} 〜 ${estimatedRateMax}`;
            row.insertCell().textContent = `${currentRankStart} 〜 ${currentRankStart + rankLimit - 1}`;
            currentRankStart += rankLimit;
        }

        // Tier外の表示
        // ブロンズ3の最低レート未満はTier外
        const bronze3MinRate = tierRateInputs['ブロンズ 3'];
        const outOfTierRow = tierRateTableBody.insertRow();
        outOfTierRow.insertCell().textContent = 'Tier外';
        outOfTierRow.insertCell().textContent = `0 〜 ${bronze3MinRate - 1}`;
        outOfTierRow.insertCell().textContent = `${currentRankStart} 〜 ${totalPlayers}`;


        // --- イベントリスナーの登録 ---
        calculateButton.addEventListener('click', calculateLadderStats);
    }

    // ページロード時にTier境界レート入力欄を生成
    generateTierRateInputs();

    // ページロード時に計算を実行して初期表示
    calculateLadderStats();
});
