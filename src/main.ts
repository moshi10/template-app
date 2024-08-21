const { min, max, floor, ceil, random } = Math;

// 配列からランダムにひとつ要素を取り出す
const pickRandomElement = (array: number[]): number => array.splice(array.length * random(), 1)[0];

// 指定範囲の数値が入った配列を生成する
const generateRange = (start: number, stop?: number, step: number = 1): number[] => {
    if (stop === undefined) {
        stop = start;
        start = 0;
    }
    if (step === undefined) {
        step = stop < start ? -1 : 1;
    }
    const length = max(0, ceil((stop - start) / step));
    return Array.from({ length }, (_, index) => start + step * index);
};

// タイル
// 牌の数
const totalTiles = 17 * 8;

// ボード
// 盤面の横幅 (周辺に空白と壁を設けるため+4)
const boardWidth = 17 + 4;
// 盤面の縦幅 (周辺に空白と壁を設けるため+4)
const boardHeight = 8 + 4;

// ボードの処理
// 盤面の座標変換
// 配列のインデックスをX座標に変換
const getX = (position: number): number => position % boardWidth;
// 配列のインデックスをY座標に変換
const getY = (position: number): number => floor(position / boardWidth);

// XY座標を配列のインデックスに変換
const fromXY = (x: number, y: number): number => x + y * boardWidth;
const fromYX = (y: number, x: number): number => fromXY(x, y);

// 盤面board上のインデックスpを空白が続く限りdずつ移動する関数
const move = (board: number[], tenP: number, kyoriD: number): number => {
    return board[tenP + kyoriD] ? tenP : move(board, tenP + kyoriD, kyoriD);
};

// 経路判定
const isPassable = (
    board: number[], // ゲームボードを表すnumber型の配列
    i0: number, // 開始位置のインデックス
    i1: number, // 終了位置のインデックス
    getU: (tenP: number) => number, // 配列のインデックスをU座標に変換
    getV: (tenP: number) => number, // 配列のインデックスをV座標に変換
    getIndexFromCoordinates: (u: number, v: number) => number // U, V座標をインデックスに変換する関数
): boolean => {
    // いっこずつ　移動する　単位ベクトル的な
    const kyoriD = getIndexFromCoordinates(1, 0);
    //　インデックスのU座標を取得
    const maxU = max(getU(move(board, i0, -kyoriD)), getU(move(board, i1, -kyoriD)));
    const minU = min(getU(move(board, i0, +kyoriD)), getU(move(board, i1, +kyoriD)));
    // インデックスのV座標を取得
    const minV = min(getV(i0), getV(i1)) + 1;
    const maxV = max(getV(i0), getV(i1)) - 1;
    // U・V座標の空白の範囲を生成
    const uRange = generateRange(maxU, minU + 1, 1);
    const vRange = generateRange(minV, maxV + 1, 1);
    // 空白の範囲に他の牌がないか判定
    return uRange.some((u) => vRange.every((v) => board[getIndexFromCoordinates(u, v)] === 0));
};

const areTilesMatchable = (board: number[], p0: number, p1: number): boolean => {
    return (
        p0 !== p1 &&
        board[p0] === board[p1] &&
        (isPassable(board, p0, p1, getX, getY, fromXY) || isPassable(board, p0, p1, getY, getX, fromYX))
    );
};

type BoardState = {
    board: number[];
    target: number;
    remainingTiles: number;
};

const createBoard = (): BoardState => {
    // floor 切り捨て
    // 1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4...
    const pickRandomElement = (array: number[]): number => array.splice(array.length * random(), 1)[0];
    const tileValues = generateRange(totalTiles).map((index) => 1 + floor(index / 4));
    const board = generateRange(boardWidth * boardHeight).map((position) => {
        // minは渡された引数の最小値を返す
        const minDistance = min(
            // 左
            getX(position),
            // 上
            getY(position),
            // 右
            boardWidth - 1 - getX(position),
            // 下
            boardHeight - 1 - getY(position)
        );
        // -1は壁
        // 0は空白
        // 1以上は牌
        return minDistance === 0 ? -1 : minDistance === 1 ? 0 : pickRandomElement(tileValues);
    });
    return { board, target: -1, remainingTiles: totalTiles };
};

const updateState = (state: BoardState, position: number): BoardState => {
    // 分割代入
    const { board, target, remainingTiles } = state;
    // -1が壁で0が空白で1が牌　壁か空白なら何もしない
    if (board[position] <= 0) return state;
    // targetが-1なら選択中の牌を更新
    if (target < 0) return { board, remainingTiles, target: position };
    // 間違ってたら元に戻す
    if (!areTilesMatchable(board, target, position)) return { board, remainingTiles, target: -1 };
    // あってたら消す
    // 選択状態　または　もういっこがあったら　0(空白)にする
    return {
        board: board.map((value, index) => (index === position || index === target ? 0 : value)),
        target: -1,
        remainingTiles: remainingTiles - 2,
    };
};

const solveBoard = (state: BoardState): boolean => {
    // 残り牌があるとき
    while (state.remainingTiles) {
        // マッチしてないやつ
        const pair = findMatchingPair(state.board);
        // マッチするやつがないとき
        if (!pair) return false;
        // マッチするやつがあるとき、全部消す
        state = updateState(state, pair[0]);
        state = updateState(state, pair[1]);
    }
    return true;
};

const findMatchingPair = (board: number[]): [number, number] | undefined => {
    //
    const pairs: { [key: number]: number[] } = {};
    // オブジェクトをぐるぐるする
    for (const [position, value] of board.entries()) {
        // 空白か壁なら何もしない
        if (value <= 0) continue;
        // まだないなら追加
        if (!pairs[value]) {
            pairs[value] = [position];
            continue;
        }
        // あったら
        for (const otherPosition of pairs[value]) {
            // 一致するか判定
            if (areTilesMatchable(board, position, otherPosition)) {
                return [position, otherPosition];
            }
        }
        // なかったらpairsに追加
        pairs[value].push(position);
    }
};

const tileCharacter = (value: number): string =>
    value < 1
        ? ''
        : value < 8
        ? '東南西北中發　'[value - 1]
        : value < 17
        ? '一二三四五六七八九'[value - 8]
        : value < 26
        ? String.fromCharCode(0x2160 + value - 17)
        : String.fromCharCode(0x2460 + value - 26);

const main = async () => {
    const style = document.createElement('style');
    style.innerHTML = `
    p {
        text-align: center;
        font: bold 1.5rem serif;
        margin: 0;
    }
    .board {
        display: table;
        margin: 0 auto;
        border-spacing: 2px;
        width: fit-content;
        font-weight: bold;
        font-family: 'Hiragino Kaku Gothic Pro','ヒラギノ角ゴ Pro W3','メイリオ',Meiryo,'ＭＳ Ｐゴシック',sans-serif;
    }
    .board > div {
        display: table-row;
    }
    .board > div > div {
        display: table-cell;
        vertical-align: middle;
        border-radius: 4px;
        height: 2.0em;
        width: 1.5em;
        border: 2px solid black;
        font-weight: bold;
        text-align: center;
        cursor: default;
        background: transparent;
        user-select: none;
    }
    .board > div > div.wall {
        background: black;
    }
    .board > div > div.none {
        visibility: hidden;
    }
    .board > div > div.selected {
        border: 2px solid red;
    }
    `;
    document.head.appendChild(style);

    const message = document.createElement('p');
    document.body.appendChild(message);
    message.innerHTML = 'generate...';

    let state = createBoard();
    // solveBoardがfalseを返したら再生成
    while (!solveBoard(state)) {
        await new Promise((f) => requestAnimationFrame(f));
        state = createBoard();
    }

    const view = document.createElement('div');
    view.classList.add('board');
    document.body.appendChild(view);

    const cells = generateRange(boardHeight).flatMap((y) => {
        const row = document.createElement('div');
        view.appendChild(row);
        return generateRange(boardWidth).map((x) => {
            const cell = document.createElement('div');
            row.appendChild(cell);
            // クリックしたらupdateStateを呼ぶ
            cell.onclick = () => render((state = updateState(state, fromXY(x, y))));
            return cell;
        });
    });

    let previousRemainingTiles = 0;
    const render = ({ board, target, remainingTiles }: BoardState) => {
        // 指定の範囲の配列作るやつ
        generateRange(boardWidth * boardHeight).forEach((position) => {
            // 画面側の処理
            const value = board[position];
            const cell = cells[position];
            const classList = cell.classList;
            cell.innerHTML = tileCharacter(value);
            classList.remove('none', 'wall', 'selected');
            if (value === 0) {
                classList.add('none');
            } else if (value < 0) {
                classList.add('wall');
            } else if (target === position) {
                classList.add('selected');
            }
        });
        if (previousRemainingTiles !== remainingTiles) {
            previousRemainingTiles = remainingTiles;
            if (!remainingTiles) {
                message.innerHTML = 'clear!';
            } else if (!findMatchingPair(board)) {
                message.innerHTML = 'game over!';
            } else {
                message.innerHTML = `${remainingTiles / 2} pairs left.`;
            }
        }
    };
    render(state);
};

main();
