/* ============================================================
 *  AI 提示词模板生成器 - 核心逻辑
 * ============================================================ */

// ============ 负面提示词预设库 ============
const NEGATIVE_PROMPTS = {
    standard: [
        '低质量', '模糊', '解剖错误', '手部畸形',
        '缺少手指', '多余手指', '手部变形',
        '扭曲', '毁容', '面部绘制糟糕',
        '变异', '丑陋', '水印', '文字', '签名'
    ],
    heavy: [
        '低分辨率', '差质量', '最差质量', '低质量',
        '普通质量', 'JPEG 伪影', '签名', '水印',
        '用户名', '模糊', '过度饱和', '解剖错误',
        '比例失调', '多余肢体', '克隆', '毁容',
        '严重比例失调', '畸形肢体', '缺少手臂',
        '缺少腿部', '多余手臂', '多余腿部', '变异',
        '变形', '丑陋', '重复', '错误', '审查',
        '画框外', '面部糟糕', '手部绘制糟糕',
        '多余手指', '缺少手指', '多余数字'
    ],
    portrait: [
        '低质量', '模糊', '解剖错误', '手部畸形',
        '面部错误', '眼睛绘制糟糕', '眼睛不对称',
        '面部不对称', '耳朵变形', '多余牙齿',
        '缺少牙齿', '牙齿歪斜', '双下巴',
        '雀斑', '痣', '斑点', '粉刺', '皱纹',
        '水印', '文字', '签名', '用户名'
    ],
    nsfw: [
        '色情', '裸露', '裸体', '色情内容', '淫秽',
        '性行为', '性暗示', '挑逗', '露骨', '变态',
        'BL', 'GL', '儿童', '孩童', '未成年',
        '小孩', '婴儿', '萝莉', '正太', '水印',
        '文字', '签名', '模糊', '低质量'
    ]
};

// ============ 绘图模型参数建议库 ============
const MODEL_PARAMS = {
    StableDiffusion: {
        steps: { value: '28-35', tip: '采样步数，过高会过度拟合，过低细节不足' },
        cfgScale: { value: '7-9', tip: '提示词相关性，值越大越严格遵循提示，但可能过饱和' },
        sampler: { value: 'DPM++ 2M / Euler a', tip: '推荐采样器，平衡速度与质量' },
        seed: { value: '-1 (随机)', tip: '固定种子可复现结果，-1 为每次随机' },
        size: { value: '512×512 / 768×768', tip: '基础分辨率，高分辨率请用高清修复' },
        denoise: { value: '0.5-0.75', tip: '高清修复时的重绘幅度' }
    },
    Midjourney: {
        version: { value: 'v6 / v5.2', tip: 'MJ 模型版本，v6 更擅长细节和文字' },
        aspect: { value: '--ar 16:9 / --ar 3:2', tip: '画面宽高比' },
        quality: { value: '--q 1 (默认)', tip: '画质参数，0.25/0.5/1/2，越高越精细' },
        stylize: { value: '--s 250 (默认)', tip: '风格化程度 0-750，越高越有艺术感' },
        chaos: { value: '--c 0-100', tip: '变化程度，越高结果差异越大' },
        exclude: { value: '--no text watermark', tip: '排除不需要的元素' }
    },
    DALL_E: {
        size: { value: '1024×1024 / 1792×1024', tip: 'DALL-E 3 支持的分辨率' },
        quality: { value: 'standard / hd', tip: 'HD 模式细节更丰富' },
        style: { value: 'vivid / natural', tip: 'vivid 更戏剧化，natural 更真实' }
    }
};

// ============ DOM 元素引用 ============
const $ = id => document.getElementById(id);
const templateType = $('templateType');
const subject = $('subject');
const imageOptions = $('imageOptions');
const writingOptions = $('writingOptions');
const chatOptions = $('chatOptions');
const codeOptions = $('codeOptions');
const generateBtn = $('generateBtn');
const randomBtn = $('randomBtn');
const positivePrompt = $('positivePrompt');
const negativePrompt = $('negativePrompt');
const negativePreset = $('negativePreset');
const negativeGroup = $('negativeGroup');
const paramGroup = $('paramGroup');
const paramSuggestions = $('paramSuggestions');

// ============ 切换选项组显隐 ============
templateType.addEventListener('change', () => {
    const val = templateType.value;
    imageOptions.classList.toggle('hidden', val !== 'image');
    writingOptions.classList.toggle('hidden', val !== 'writing');
    chatOptions.classList.toggle('hidden', val !== 'chat');
    codeOptions.classList.toggle('hidden', val !== 'code');

    // 绘图模板显示负面词和参数建议
    const isImage = val === 'image';
    negativeGroup.classList.toggle('hidden', !isImage);
    paramGroup.classList.toggle('hidden', !isImage);
});

// ============ 负面词预设切换 ============
negativePreset.addEventListener('change', () => {
    if (templateType.value === 'image') {
        negativePrompt.value = NEGATIVE_PROMPTS[negativePreset.value].join(', ');
    }
});

// ============ 生成主逻辑 ============
generateBtn.addEventListener('click', () => {
    const type = templateType.value;
    const subj = subject.value.trim();
    if (!subj) {
        alert('请填写「主体描述」');
        subject.focus();
        return;
    }

    let result = '';
    if (type === 'image') {
        result = generateImagePrompt(subj);
        negativePrompt.value = NEGATIVE_PROMPTS[negativePreset.value].join(', ');
        renderParamSuggestions();
    } else if (type === 'writing') {
        result = generateWritingPrompt(subj);
        negativeGroup.classList.add('hidden');
        paramGroup.classList.add('hidden');
    } else if (type === 'chat') {
        result = generateChatPrompt(subj);
        negativeGroup.classList.add('hidden');
        paramGroup.classList.add('hidden');
    } else if (type === 'code') {
        result = generateCodePrompt(subj);
        negativeGroup.classList.add('hidden');
        paramGroup.classList.add('hidden');
    }

    positivePrompt.value = result;
});

// ============ 绘图提示词生成 ============
function generateImagePrompt(subj) {
    const style = $('artStyle').value;
    const quality = $('quality').value;
    const lighting = $('lighting').value;
    const viewAngle = $('viewAngle').value;
    const colorTone = $('colorTone').value;
    const extra = $('extraKeywords').value.trim();

    const parts = [quality, subj, style, lighting, viewAngle, colorTone];
    if (extra) {
        parts.push(extra.split(/[,，]/).map(k => k.trim()).filter(Boolean).join(', '));
    }
    parts.push('复杂精细的细节');

    return parts.filter(Boolean).join(', ');
}

// ============ 写作提示词生成 ============
function generateWritingPrompt(subj) {
    const type = $('writingType').value;
    const tone = $('writingTone').value;
    const extra = $('extraKeywords').value.trim();

    return `请以「${tone}」的风格，创作一篇关于「${subj}」的${type}。
${extra ? `\n额外要求：${extra}` : ''}
\n请确保内容：
- 结构清晰，层次分明
- 语言生动，富有感染力
- 有明确的主题和立意
- 篇幅适中（500-800字）`;
}

// ============ 对话提示词生成 ============
function generateChatPrompt(subj) {
    const role = $('chatRole').value;
    const extra = $('extraKeywords').value.trim();

    return `# 角色设定
你现在是一位资深的${role}，具备丰富的专业知识和耐心的指导态度。

# 用户问题
${subj}
${extra ? `\n# 补充背景\n${extra}` : ''}

# 对话要求
- 请以专业且易懂的方式回答
- 适当举例让解释更生动
- 如需进一步了解，请主动追问`;
}

// ============ 编程提示词生成 ============
function generateCodePrompt(subj) {
    const lang = $('codeLanguage').value;
    const task = $('codeTask').value;
    const extra = $('extraKeywords').value.trim();

    return `# 任务
${task}：${subj}

# 技术栈
- 编程语言：${lang}
${extra ? `- 额外要求：${extra}` : ''}

# 输出要求
- 提供完整可运行的代码
- 添加清晰的注释说明
- 遵循 ${lang} 最佳实践
- 说明代码的时间/空间复杂度
- 如有需要，提供使用示例`;
}

// ============ 参数建议渲染 ============
function renderParamSuggestions() {
    let html = '';
    for (const [modelName, params] of Object.entries(MODEL_PARAMS)) {
        html += `<div style="margin-bottom:16px;">
            <h4 style="margin-bottom:10px;color:#4a5568;font-size:0.95rem;border-bottom:1px dashed #cbd5e1;padding-bottom:6px;">
                🎛️ ${modelName}
            </div>`;
        for (const [key, val] of Object.entries(params)) {
            const labelMap = {
                steps: '采样步数', cfgScale: 'CFG 引导系数', sampler: '采样器',
                seed: '随机种子', size: '生成尺寸', denoise: '重绘幅度',
                version: '模型版本', aspect: '宽高比', quality: '画质',
                stylize: '风格化', chaos: '变化程度', exclude: '排除词',
            };
            html += `<div class="param-item">
                <div>
                    <span class="param-label">${labelMap[key] || key}</span>
                    <span class="param-tip">${val.tip}</span>
                </div>
                <span class="param-value">${val.value}</span>
            </div>`;
        }
        html += '</div>';
    }
    paramSuggestions.innerHTML = html;
}

// ============ 随机组合 ============
randomBtn.addEventListener('click', () => {
    if (templateType.value !== 'image') {
        alert('🎲 随机组合功能当前仅支持「AI 绘图提示词」模板');
        return;
    }

    // 随机填充下拉框
    const selects = ['artStyle', 'quality', 'lighting', 'viewAngle', 'colorTone'];
    selects.forEach(id => {
        const el = $(id);
        const options = Array.from(el.options);
        el.value = options[Math.floor(Math.random() * options.length)].value;
    });

    // 随机填入主题示例
    const subjects = [
        '一只戴着礼帽的柴犬', '赛博朋克城市夜景', '漂浮在空中的岛屿',
        '森林中的神秘城堡', '星空下的孤独旅人', '粉色头发的动漫少女',
        '深海中的发光水母', '机械龙与机甲战士', '被樱花包围的古寺',
        '蒸汽朋克风格的飞行器', '极光下的雪山湖泊', '糖果色的梦境世界'
    ];
    subject.value = subjects[Math.floor(Math.random() * subjects.length)];

    // 触发生成
    generateBtn.click();
});

// ============ 复制按钮 ============
document.addEventListener('click', e => {
    if (!e.target.classList.contains('copy-btn')) return;

    const targetId = e.target.dataset.target;
    const textarea = $(targetId);
    if (!textarea.value) {
        alert('没有可复制的内容');
        return;
    }

    navigator.clipboard.writeText(textarea.value).then(() => {
        const oldText = e.target.textContent;
        e.target.textContent = '✅ 已复制';
        e.target.classList.add('copied');
        setTimeout(() => {
            e.target.textContent = oldText;
            e.target.classList.remove('copied');
        }, 1500);
    }).catch(() => {
        // 降级方案
        textarea.select();
        document.execCommand('copy');
        e.target.textContent = '✅ 已复制';
        e.target.classList.add('copied');
        setTimeout(() => {
            e.target.textContent = '📋 复制';
            e.target.classList.remove('copied');
        }, 1500);
    });
});

// ============ 初始化 ============
window.addEventListener('DOMContentLoaded', () => {
    generateBtn.click();
});