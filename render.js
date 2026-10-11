
"use strict";

window.addEventListener("load", function () {

    // 1. 获取画布和 WebGL 2.0 上下文
    const canvas = document.getElementById("gl-canvas");
    const gl = canvas.getContext("webgl2");

    if (!gl) {
        alert("当前浏览器不支持 WebGL 2.0");
        return;
    }

    // 2. 定义原始三角形
    const vertices = [
        [-0.9, -0.9],
        [ 0.9, -0.9],
        [ 0.0,  0.9]
    ];

    // 3. 生成 5000 个点
    const points = generateChaosPoints(vertices, 5000);

    // 4. 转换为 GPU 能接收的连续数值数组
    const vertexData = new Float32Array(points.flat());

    // 5. 编译、链接并使用着色器程序
    const program = initShaders(
        gl, "vertex-shader", "fragment-shader"
    );
    gl.useProgram(program);

    // 6. 创建顶点缓冲区并上传数据
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        vertexData,
        gl.STATIC_DRAW
    );

    // 7. 告诉着色器如何读取二维坐标
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    // 8. 设置画布并绘制
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.POINTS, 0, points.length);

    console.log("点的数量：", points.length);
    console.log("上传的坐标数值：", vertexData.length);
});
