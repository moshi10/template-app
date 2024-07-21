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
const getXCoordinate = (position: number): number => position % boardWidth;
// 配列のインデックスをY座標に変換
const getYCoordinate = (position: number): number => floor(position / boardWidth);

// XY座標を配列のインデックスに変換
const fromXYCoordinates = (x: number, y: number): number => x + y * boardWidth;
const fromYXCoordinates = (y: number, x: number): number => fromXYCoordinates(x, y);

// 盤面board上のインデックスpを空白が続く限りdずつ移動する関数
const move = (board: number[], position: number, direction: number): number => {
    return board[position + direction] ? position : move(board, position + direction, direction);
};

// 経路判定
const isPassable = (
    board: number[], // ゲームボードを表すnumber型の配列
    start: number, // 開始位置のインデックス
    end: number, // 終了位置のインデックス
    getUCoordinate: (position: number) => number, // 配列のインデックスをU座標に変換
    getVCoordinate: (position: number) => number, // 配列のインデックスをV座標に変換
    getIndexFromCoordinates: (u: number, v: number) => number // U, V座標をインデックスに変換する関数
): boolean => {
    // いっこ移動する
    const direction = getIndexFromCoordinates(1, 0);
    //
    const startU = max(getUCoordinate(move(board, start, -direction)), getUCoordinate(move(board, end, -direction)));
    const endU = min(getUCoordinate(move(board, start, +direction)), getUCoordinate(move(board, end, +direction)));
    const startV = min(getVCoordinate(start), getVCoordinate(end)) + 1;
    const endV = max(getVCoordinate(start), getVCoordinate(end)) - 1;
    const uRange = generateRange(startU, endU + 1, 1);
    const vRange = generateRange(startV, endV + 1, 1);
    return uRange.some((u) => vRange.every((v) => board[getIndexFromCoordinates(u, v)] === 0));
};

const areTilesMatchable = (board: number[], start: number, end: number): boolean =>
    start !== end &&
    board[start] === board[end] &&
    (isPassable(board, start, end, getXCoordinate, getYCoordinate, fromXYCoordinates) ||
        isPassable(board, start, end, getYCoordinate, getXCoordinate, fromYXCoordinates));

type BoardState = {
    board: number[];
    target: number;
    remainingTiles: number;
};

const createBoard = (): BoardState => {
    // floor 切り捨て
    // 1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4...
    const tileValues = generateRange(totalTiles).map((index) => 1 + floor(index / 4));

    const board = generateRange(boardWidth * boardHeight).map((position) => {
        // minは渡された引数の最小値を返す
        const minDistance = min(
            // 左
            getXCoordinate(position),
            // 上
            getYCoordinate(position),
            // 右
            boardWidth - 1 - getXCoordinate(position),
            // 下
            boardHeight - 1 - getYCoordinate(position)
        );
        // 0は壁
        // 1は空白
        // 2以上は牌
        return minDistance === 0 ? -1 : minDistance === 1 ? 0 : pickRandomElement(tileValues);
    });
    return { board, target: -1, remainingTiles: totalTiles };
};

const updateState = (state: BoardState, position: number): BoardState => {
    const { board, target, remainingTiles } = state;
    if (board[position] <= 0) return state;
    if (target < 0) return { board, remainingTiles, target: position };
    if (!areTilesMatchable(board, target, position)) return { board, remainingTiles, target: -1 };
    return {
        board: board.map((value, index) => (index === position || index === target ? 0 : value)),
        target: -1,
        remainingTiles: remainingTiles - 2,
    };
};

const solveBoard = (state: BoardState): boolean => {
    while (state.remainingTiles) {
        const pair = findMatchingPair(state.board);
        if (!pair) return false;
        state = updateState(state, pair[0]);
        state = updateState(state, pair[1]);
    }
    return true;
};

const findMatchingPair = (board: number[]): [number, number] | undefined => {
    const pairs: { [key: number]: number[] } = {};
    for (const [position, value] of board.entries()) {
        if (value <= 0) continue;
        if (!pairs[value]) {
            pairs[value] = [position];
            continue;
        }
        for (const otherPosition of pairs[value]) {
            if (areTilesMatchable(board, position, otherPosition)) {
                return [position, otherPosition];
            }
        }
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
            cell.onclick = () => render((state = updateState(state, fromXYCoordinates(x, y))));
            return cell;
        });
    });

    let previousRemainingTiles = 0;
    const render = ({ board, target, remainingTiles }: BoardState) => {
        generateRange(boardWidth * boardHeight).forEach((position) => {
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
