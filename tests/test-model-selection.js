/**
 * 个人画像模型选型测试脚本
 *
 * 用途：快速对比不同 Ollama 模型在三个核心任务上的表现
 *
 * 测试任务：
 * 1. 深度追问生成（苏格拉底式提问）
 * 2. 洞察提取（从对话中提取人格特质）
 * 3. 结构化输出（JSON 格式稳定性）
 *
 * 使用方法：
 *   node tests/test-model-selection.js
 */

import ollama from 'ollama';
import fs from 'fs/promises';
import path from 'path';

// ============ 配置区 ============

// 待测试的模型列表
const MODELS_TO_TEST = [
    'qwen2.5:7b-instruct',           // 首选推荐
    'deepseek-r1:7b',                // 高级备选
    'vortex/helpingai-9b',           // 情感增强（需先 pull）
    // 'qwen2.5:14b-instruct',       // 高性能版本（可选）
];

// 测试用例
const TEST_CASES = {
    deep_questioning: {
        name: '深度追问能力测试',
        system_prompt: `你是一位经验丰富的访谈者，擅长苏格拉底式提问。
你的任务是基于用户的回答，提出一个深入的追问，帮助他们更深入地思考。

要求：
1. 问题要开放性强，避免是/否问题
2. 关注"为什么"而非"是什么"
3. 展现同理心，但保持中立
4. 引导用户探索更深层的动机和价值观

输出格式（JSON）：
{
  "question": "你的追问",
  "reasoning": "为什么提出这个问题",
  "expected_insight": "期望挖掘的洞察类型"
}`,
        user_input: '我觉得我最看重的是自由，不想被工作束缚。',
        evaluation_criteria: [
            '问题是否开放性强',
            '是否避免了简单的是/否问题',
            '是否展现了同理心',
            '是否关注深层动机',
            'JSON 格式是否正确'
        ]
    },

    insight_extraction: {
        name: '洞察提取能力测试',
        system_prompt: `基于以下对话，提取一个关键洞察。

以 JSON 格式输出：
{
  "insight_type": "价值观 | 动机 | 性格特质",
  "insight": "洞察内容",
  "evidence": "支持证据",
  "confidence": 0.0-1.0
}

注意：仅基于明确证据进行分析，避免过度推断。`,
        user_input: `对话记录：

Q: 你最自豪的成就是什么？
A: 我帮一个朋友走出了抑郁。

Q: 为什么这对你如此重要？
A: 因为我也曾经历过那种黑暗，知道有人陪伴的价值。`,
        evaluation_criteria: [
            '洞察是否基于证据',
            '是否避免过度推断',
            '置信度评估是否合理',
            'JSON 格式是否正确',
            '洞察深度是否足够'
        ]
    },

    structured_output: {
        name: '结构化输出稳定性测试',
        system_prompt: `你必须且只能输出 JSON，不要添加任何额外文字说明。

请严格按照以下 JSON schema 输出：

{
  "user_id": "string",
  "traits": [
    {"name": "string", "score": 0.0-1.0}
  ],
  "timestamp": "ISO8601格式"
}

不要添加任何额外的文字，如"好的"、"这是JSON"等。`,
        user_input: '请为用户 user_001 生成一个包含三个性格特质的评估。',
        evaluation_criteria: [
            '输出是否为纯 JSON',
            '是否没有额外文字前缀/后缀',
            '是否严格遵循 schema',
            '数据类型是否正确',
            'timestamp 格式是否符合 ISO8601'
        ]
    }
};

// ============ 工具函数 ============

/**
 * 检查模型是否已下载
 */
async function checkModelAvailability(modelName) {
    try {
        const models = await ollama.list();
        return models.models.some(m => m.name.startsWith(modelName));
    } catch (error) {
        console.error(`检查模型失败: ${error.message}`);
        return false;
    }
}

/**
 * 运行单个测试用例
 */
async function runTestCase(modelName, testCase) {
    const startTime = Date.now();

    try {
        const response = await ollama.chat({
            model: modelName,
            messages: [
                {
                    role: 'system',
                    content: testCase.system_prompt
                },
                {
                    role: 'user',
                    content: testCase.user_input
                }
            ],
            options: {
                temperature: 0.7,
                num_predict: 500,  // 限制输出长度
            }
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const output = response.message.content;

        return {
            success: true,
            output,
            responseTime,
            tokensGenerated: output.split(/\s+/).length,  // 粗略估算
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            responseTime: Date.now() - startTime
        };
    }
}

/**
 * 评估 JSON 输出质量
 */
function evaluateJsonOutput(output) {
    // 去除可能的 markdown 代码块标记
    let cleanedOutput = output.trim();
    cleanedOutput = cleanedOutput.replace(/^```json\n/, '').replace(/\n```$/, '');

    // 检查是否有额外文字
    const hasExtraText = /^[^{]/.test(cleanedOutput) || /[^}]$/.test(cleanedOutput);

    try {
        const parsed = JSON.parse(cleanedOutput);
        return {
            isValidJson: true,
            hasExtraText,
            parsed,
            isPureJson: !hasExtraText
        };
    } catch (error) {
        return {
            isValidJson: false,
            hasExtraText,
            error: error.message,
            isPureJson: false
        };
    }
}

/**
 * 计算响应速度（tokens/s）
 */
function calculateSpeed(tokensGenerated, responseTime) {
    return (tokensGenerated / (responseTime / 1000)).toFixed(2);
}

/**
 * 格式化测试结果
 */
function formatResults(results) {
    let report = '\n';
    report += '='.repeat(80) + '\n';
    report += '                  个人画像模型选型测试报告\n';
    report += '='.repeat(80) + '\n';
    report += `测试时间: ${new Date().toLocaleString('zh-CN')}\n`;
    report += `测试模型数: ${results.length}\n`;
    report += '='.repeat(80) + '\n\n';

    for (const modelResult of results) {
        report += `\n📊 模型: ${modelResult.modelName}\n`;
        report += '-'.repeat(80) + '\n';

        for (const [testName, testResult] of Object.entries(modelResult.tests)) {
            const testCase = TEST_CASES[testName];
            report += `\n✨ 测试: ${testCase.name}\n`;

            if (!testResult.success) {
                report += `   ❌ 测试失败: ${testResult.error}\n`;
                continue;
            }

            report += `   ⏱️  响应时间: ${testResult.responseTime}ms\n`;
            report += `   🚀 生成速度: ${calculateSpeed(testResult.tokensGenerated, testResult.responseTime)} tokens/s\n`;

            // JSON 评估
            const jsonEval = evaluateJsonOutput(testResult.output);
            report += `   📝 JSON 有效性: ${jsonEval.isValidJson ? '✅' : '❌'}\n`;
            report += `   🎯 纯 JSON 输出: ${jsonEval.isPureJson ? '✅' : '❌'}\n`;

            if (jsonEval.hasExtraText) {
                report += `   ⚠️  包含额外文字（非纯 JSON）\n`;
            }

            report += `\n   📄 模型输出:\n`;
            report += '   ' + '-'.repeat(76) + '\n';
            report += testResult.output.split('\n').map(line => '   ' + line).join('\n') + '\n';
            report += '   ' + '-'.repeat(76) + '\n';

            if (jsonEval.isValidJson) {
                report += `\n   🔍 解析后的 JSON:\n`;
                report += '   ' + JSON.stringify(jsonEval.parsed, null, 2).split('\n').map(line => '   ' + line).join('\n') + '\n';
            }

            report += `\n   📋 评估标准:\n`;
            testCase.evaluation_criteria.forEach((criterion, idx) => {
                report += `      ${idx + 1}. ${criterion}\n`;
            });
        }

        report += '\n' + '='.repeat(80) + '\n';
    }

    return report;
}

// ============ 主测试流程 ============

async function main() {
    console.log('🚀 开始模型选型测试...\n');

    const results = [];

    for (const modelName of MODELS_TO_TEST) {
        console.log(`\n检查模型: ${modelName}`);

        const isAvailable = await checkModelAvailability(modelName);

        if (!isAvailable) {
            console.log(`⚠️  模型 ${modelName} 未安装，跳过测试`);
            console.log(`   提示：运行 "ollama pull ${modelName}" 下载模型\n`);
            continue;
        }

        console.log(`✅ 模型已安装，开始测试...\n`);

        const modelResult = {
            modelName,
            tests: {}
        };

        for (const [testId, testCase] of Object.entries(TEST_CASES)) {
            console.log(`   运行测试: ${testCase.name}...`);

            const testResult = await runTestCase(modelName, testCase);
            modelResult.tests[testId] = testResult;

            if (testResult.success) {
                console.log(`   ✅ 完成 (${testResult.responseTime}ms)\n`);
            } else {
                console.log(`   ❌ 失败: ${testResult.error}\n`);
            }
        }

        results.push(modelResult);
    }

    // 生成报告
    const report = formatResults(results);
    console.log(report);

    // 保存报告到文件
    const reportDir = path.join(process.cwd(), 'test-results');
    try {
        await fs.mkdir(reportDir, { recursive: true });
    } catch (error) {
        // 目录可能已存在，忽略错误
    }

    const reportPath = path.join(
        reportDir,
        `model-selection-report-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
    );

    await fs.writeFile(reportPath, report, 'utf-8');
    console.log(`\n📁 报告已保存到: ${reportPath}\n`);

    // 输出推荐建议
    console.log('\n💡 快速建议:\n');
    console.log('1️⃣  如果所有测试都未运行，请先下载模型:');
    console.log('    ollama pull qwen2.5:7b-instruct\n');
    console.log('2️⃣  查看详细评估标准，手动评分模型输出质量');
    console.log('3️⃣  重点关注 JSON 格式稳定性和输出自然度');
    console.log('4️⃣  根据报告选择最适合你任务的模型\n');
}

// 运行测试
main().catch(console.error);
