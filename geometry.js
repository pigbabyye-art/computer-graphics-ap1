
"use strict";

/**
 * 计算二维平面上两个点的中点。
 *
 * @param {number[]} p 第一个点 [x1, y1]
 * @param {number[]} q 第二个点 [x2, y2]
 * @returns {number[]} 中点坐标 [x, y]
 */
function midpoint(p, q) {
    const x = (p[0] + q[0]) / 2;
    const y = (p[1] + q[1]) / 2;

    return [x, y];
}

// 在三角形内部随机生成一个初始点
function randomPointInTriangle(vertices) {
    const [a, b, c] = vertices;

    let u = Math.random();
    let v = Math.random();

    if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
    }

    return [
        a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]),
        a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1])
    ];
}

// 混沌游戏：生成指定数量的点
function generateChaosPoints(vertices, count) {
    const points = [];

    let currentPoint = randomPointInTriangle(vertices);

    for (let i = 0; i < count; i++) {
        // 随机选择三个顶点中的一个
        const index = Math.floor(Math.random() * 3);
        const vertex = vertices[index];

        // 计算当前点与随机顶点的中点
        currentPoint = midpoint(currentPoint, vertex);

        // 保存生成的新点
        points.push(currentPoint);
    }

    return points;
}


/**
 * 递归细分三角形，生成 Sierpinski 垫片。
 * triangle: [A, B, C]
 * depth: 递归深度
 * 返回值: 保留下来的所有小三角形
 */
function subdivide(triangle, depth) {

    // 递归终止条件
    if (depth === 0) {
        return [triangle];
    }

    // 获取三个顶点
    const [a, b, c] = triangle;

    // 计算三条边的中点
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);

    // 只递归处理三个角上的小三角形
    return [
        ...subdivide([a, ab, ca], depth - 1),
        ...subdivide([ab, b, bc], depth - 1),
        ...subdivide([ca, bc, c], depth - 1)
    ];
}

/**
 * 将 subdivide 返回的三角形列表转换为三种绘制模式的数据。
 * 输入格式：[[A, B, C], ...]，每个顶点为 [x, y]。
 * 不修改输入；顶点不去重。points 与 triangles 复用同一份数据。
 */
function buildRecursiveRenderData(triangles) {
    const triangleCoordinates = [];
    const lineCoordinates = [];

    for (const [a, b, c] of triangles) {
        // 三个顶点：既可以逐点绘制，也可以组成一个填充三角形。
        triangleCoordinates.push(...a, ...b, ...c);

        // 三条独立边：AB、BC、CA，每条边需要两个端点。
        lineCoordinates.push(...a, ...b, ...b, ...c, ...c, ...a);
    }

    const triangleData = new Float32Array(triangleCoordinates);

    return {
        points: triangleData,
        lines: new Float32Array(lineCoordinates),
        triangles: triangleData
    };
}
