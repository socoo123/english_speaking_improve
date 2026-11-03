import { learningProgress, weekDates } from './progress.mjs';
import { SCORE_KEYS, SCORE_LABELS, adaptiveFeedbackTemplate as feedbackTemplate, parseReport, gradeQuiz } from './report.mjs';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const list = items => `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
const scoreCards = scores => `<div class="score-grid">${SCORE_KEYS.map(key => `<div class="score"><strong>${scores?.[key] ?? '—'}${scores?.[key] != null ? '<small> / 5</small>' : ''}</strong><span>${SCORE_LABELS[key]}</span></div>`).join('')}</div>`;
let lessons, progress, rules, lesson, selfReview = {}, feedbackText = '', view = '';
let toastTimer;

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 4500);
}

function readLocal(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function saveLocal(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch { toast('浏览器无法保存，请下载 JSON 备份。'); return false; }
}

async function copyText(text, textarea) {
  try { await navigator.clipboard.writeText(text); toast('已复制，可以粘贴到 GPT 对话。'); }
  catch {
    textarea.focus(); textarea.select();
    toast('自动复制不可用，已选中文本，请手动复制。');
  }
}

function downloadReport(text) {
  const result = parseReport(text, lesson.id);
  if (!result.valid) { showFeedback(result); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(result.report, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lesson-${lesson.id}-feedback-${result.report.assessedAt}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已导出反馈。它仍是待复核报告，不是正式成绩。');
}

function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

function videoSection() {
  const source = lesson.source;
  const verified = source.status === 'verified' && safeUrl(source.url) && safeUrl(source.licenseUrl) && source.verifiedAt && source.licenseSummary;
  let player = '';
  if (verified && /^[A-Za-z0-9_-]{11}$/.test(source.youtubeId)) {
    player = `<iframe class="video-frame" src="https://www.youtube-nocookie.com/embed/${escape(source.youtubeId)}" title="${escape(source.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  } else if (verified && safeUrl(source.mediaUrl)) {
    player = `<video class="video-frame" controls preload="metadata" playsinline aria-label="${escape(source.title)}"><source src="${escape(safeUrl(source.mediaUrl))}" type="video/mp4">浏览器不支持视频，请使用下面的官方视频链接。</video>`;
  }
  if (player) return `<h3>${escape(source.title)} <span class="heading-en">${escape(source.duration)}</span></h3>${player}<p id="video-help" class="small-text muted">${escape(source.captions || '字幕以播放器可用选项为准。')} 播放不了时，可打开官方课程页或直接视频。</p><p class="small-text"><a href="${escape(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">官方课程与课文 ↗</a>${safeUrl(source.mediaUrl) ? ` · <a href="${escape(safeUrl(source.mediaUrl))}" target="_blank" rel="noopener noreferrer">直接打开视频 ↗</a>` : ''}${safeUrl(source.lessonPlanUrl) ? ` · <a href="${escape(safeUrl(source.lessonPlanUrl))}" target="_blank" rel="noopener noreferrer">官方课程 PDF ↗</a>` : ''}</p><details><summary>来源与使用说明</summary><p class="small-text muted">${escape(source.licenseSummary)} · 核实日期：${escape(source.verifiedAt)}</p><a href="${escape(safeUrl(source.licenseUrl))}" target="_blank" rel="noopener noreferrer">查看来源许可 ↗</a></details>`;
  return `<div class="video-placeholder"><span class="play" aria-hidden="true">▷</span><h3>为本章挑一段合适的美音视频</h3><p>${escape(source.notes)}</p><span class="badge neutral">待核实来源 · 暂无视频</span></div>`;
}

function quizMarkup() {
  return `<form id="quiz-form">${lesson.quiz.map((question, index) => `<fieldset class="quiz-question"><legend>${index + 1}. ${escape(question.question)}</legend>${question.type === 'choice' ? question.options.map((option, i) => `<label class="option"><input type="radio" name="${question.id}" value="${i}"><span>${escape(option)}</span></label>`).join('') : `<label class="sr-only" for="${question.id}">第 ${index + 1} 题答案</label><input class="fill-input" id="${question.id}" name="${question.id}" type="text" autocomplete="off" placeholder="填写英文答案">`}<div id="result-${question.id}" aria-live="polite"></div></fieldset>`).join('')}<div class="actions"><button class="button" type="submit">检查答案</button><button class="button secondary" type="reset">重新练习</button></div><div id="quiz-summary" class="quiz-summary" role="status"></div></form>`;
}

function selfReviewMarkup() {
  const difficulties = ['语速与连读', '生词与搭配', '句子与语法', '听懂但说不出', '发音与重音', '背景知识'];
  return `<section class="content-section" id="self-review"><h3>看完后，你觉得怎么样？</h3><p class="muted">先正常看一遍，记录字幕和倍速。卡在哪里比答对几题更有用；卡点可以多选，也可以补充具体时间点和句子。</p>
    <form id="self-review-form"><label class="check-label"><input name="watched" type="checkbox" ${selfReview.watched ? 'checked' : ''} ${lesson.source.status !== 'verified' ? 'disabled' : ''}><span>我已经看过本课视频<small class="muted">看完后再记录感受，不要求一次全听懂。</small></span></label>
    <fieldset class="quiz-question"><legend>整体感受</legend><div class="rating-options">${[['easy','简单'],['suitable','适合'],['hard','困难']].map(([value, label]) => `<label class="option"><input type="radio" name="difficulty" value="${value}" ${selfReview.difficulty === value ? 'checked' : ''} ${!selfReview.watched ? 'disabled' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>
    <fieldset class="quiz-question"><legend>难在哪里？（可选；没有卡点可以不选）</legend><div class="difficulty-options">${difficulties.map(label => `<label class="option"><input type="checkbox" name="difficulties" value="${escape(label)}" ${Array.isArray(selfReview.difficulties) && selfReview.difficulties.includes(label) ? 'checked' : ''}><span>${escape(label)}</span></label>`).join('')}</div></fieldset>
    <label class="form-label" for="captions">观看时用的字幕</label><select id="captions" name="captions">${[['','未记录'],['none','无字幕'],['en','英文字幕'],['zh','中文字幕'],['mixed','混合使用']].map(([value,label]) => `<option value="${value}" ${selfReview.captions === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
    <label class="form-label" for="playback-rate">播放倍速</label><select id="playback-rate" name="playbackRate">${[['','未记录'],['0.75','0.75 倍'],['1','正常速度'],['1.25','1.25 倍'],['1.5','1.5 倍']].map(([value,label]) => `<option value="${value}" ${String(selfReview.playbackRate) === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
    <label class="form-label" for="self-review-notes">具体卡点或想和外教聊的内容</label><textarea id="self-review-notes" name="notes" class="prompt-box short-box" placeholder="例如：01:20 这句话听了几遍才懂；能听懂，但让我自己说就卡住了。">${escape(selfReview.notes)}</textarea><p id="self-review-status" class="muted small-text" role="status">自评仅保存在本浏览器，复制外教指令时会一起带上。</p></form>
    <div class="actions"><a href="#tutor" class="button">带着自评，和外教聊一聊 →</a></div></section>`;
}

function lessonView() {
  return `<section class="content-section"><div class="section-title"><h3>本周目标</h3><span class="muted small-text">${escape(lesson.level)}</span></div><ul class="goals">${lesson.goals.map(goal => `<li>${escape(goal)}</li>`).join('')}</ul></section>
    <section class="content-section" id="video">${videoSection()}<div class="actions"><a class="button secondary" href="#lesson/text">阅读本课课文 ↓</a><a class="inline-link" href="#lesson/self-review">填写观看感受 ↓</a></div></section>
    <section class="content-section" id="text" aria-labelledby="text-title"><div class="status-row"><h3 id="text-title">本课英文原文与中文释义 <span class="heading-en">${escape(lesson.englishTitle)}</span></h3><button class="button secondary small" id="toggle-translation" aria-pressed="false">隐藏中文</button></div><p class="muted small-text">${escape(lesson.source.textNote || "本站原创练习，非视频逐字稿。")}</p>${/^[a-z0-9-]+\.txt$/.test(lesson.source.transcriptFile) ? `<p class="small-text"><a href="./data/transcripts/${escape(lesson.source.transcriptFile)}" download>下载英文课文 TXT ↓</a></p>` : ''}<p class="muted small-text">先理解，再挑核心表达背诵，最后脱稿复述。整段背诵可以分几次完成。</p><ol class="transcript">${lesson.text.map(line => `<li><span class="speaker">${escape(line.speaker)}</span><p class="english" lang="en">${escape(line.en)}</p><p class="translation">${escape(line.zh)}</p></li>`).join('')}</ol></section>
    ${selfReviewMarkup()}
    <div class="actions"><a class="button" href="#language">接着练词汇与句型 →</a></div>`;
}

function languageView() {
  return `<section class="content-section" id="words"><h3>核心词汇与搭配</h3><p class="muted small-text">结合例句记忆，再换成你自己的工作场景。</p><div class="vocab-list">${lesson.vocabulary.map(word => `<article class="vocab-row"><div><h4 lang="en">${escape(word.word)}</h4><span class="ipa">${escape(word.ipa)}</span><p class="meaning">${escape(word.meaning)}</p></div><div><p class="example" lang="en">${escape(word.example)}</p><p class="muted small-text">${escape(word.note)}</p></div></article>`).join('')}</div></section>
    <section class="content-section" id="grammar"><h3>把句型变成自己的表达</h3>${lesson.patterns.map(pattern => `<article class="pattern"><h4>${escape(pattern.form)}</h4><p>${escape(pattern.explanation)}</p><p class="example" lang="en">${escape(pattern.example)}</p>${pattern.contrast ? `<p class="muted small-text">${escape(pattern.contrast)}</p>` : ''}</article>`).join('')}</section>
    <section class="content-section" id="pronunciation"><h3>美音练习重点</h3><p class="muted">请外教听真实音频，选 1—3 个重点纠正，再用新句复测。这些是观察目标，并非已发现的个人错误。</p>${list(lesson.pronunciationTargets)}<h4>本周核心背诵</h4><div class="memorize" lang="en">${list(lesson.memorize)}</div></section><div class="actions"><a href="#quiz" class="button">可选：复习几个表达 →</a></div>`;
}

function quizView() {
  return `<section class="content-section"><h3>可选表达练习</h3><p class="muted">根据视频内容和本课表达编写的练习。帮助回顾，做题成绩不代表口语水平；也可以直接找外教对话。</p>${quizMarkup()}</section><div class="actions"><a href="#tutor" class="inline-link">练会了，找外教聊一聊 →</a></div>`;
}

function tutorPrompt() {
  return `${rules}

--- 当前课程（请以本段约束本次教学） ---
lessonId: ${lesson.id}
标题：${lesson.title} / ${lesson.englishTitle}
素材状态：${lesson.source.status === 'verified' ? `已核实的视频来源：${lesson.source.title}（${lesson.source.url}）。仅凭本指令不得声称已观看或听过视频。` : '原创练习；视频待核实。没有视频字幕，请勿声称已看过或听过外部视频。'}
课文说明：${lesson.source.textNote || '本站原创配套练习'}
目标：${lesson.goals.join('；')}
视频自评（尚未填写的项目请在对话中询问，不要推断）：${JSON.stringify(selfReview)}

课文（${lesson.source.status === 'verified' ? '来源：' + lesson.source.title : '本站原创'}）：
${lesson.text.map(line => `${line.speaker}: ${line.en}`).join('\n')}

核心表达：
${lesson.memorize.join('\n')}
词汇与例句：
${lesson.vocabulary.map(word => `${word.word} ${word.ipa}（${word.meaning}）: ${word.example}`).join('\n')}
句型语法：
${lesson.patterns.map(pattern => `${pattern.form}：${pattern.explanation} 例句：${pattern.example}`).join('\n')}
待观察的发音目标（不是已发现的个人错误）：
${lesson.pronunciationTargets.join('\n')}
公开陪练场景：
${lesson.practiceScenarios.join('\n')}
对话观察重点：${lesson.assessmentFocus}

评估以实际对话证据为准，不进行独立入学考试，不使用固定过关分数。先了解视频难易和观看条件，再聊内容、换场景、纠正发音。下一条视频前期仍约5分钟，每次只调整一个难度因素。未评估用 null；不要根据文字给口语流畅度或发音打分。
本次报告模板（根据真实对话填写；assessedAt 使用实际日期；pronunciationNotes 每项必须有 target、observed、correction、retest、status；status 为 resolved/improving/unresolved/verified）：
${JSON.stringify(feedbackTemplate(lesson.id, selfReview), null, 2)}
结束时输出一个完整 JSON 代码块。报告只是外教建议，不能声称已更新网页、仓库或正式进度。`;
}

function tutorView() {
  return `<section class="content-section"><h3>看完视频，和外教聊一聊</h3><p class="muted">先在「视频与课文」记录简单／适合／困难及卡点，再复制下面的指令到 GPT 语音会话。外教会聊视频内容、让你复述并换个场景使用表达，逐步了解你的水平。</p><p class="notice">不另设开课测试，也不要求达到固定分数才调整课程。先交流，再纠正；下一课根据你的感受和实际表现共同决定。</p>
    <label class="form-label" for="tutor-prompt">本周专属外教指令（包含当前视频自评）</label><textarea id="tutor-prompt" class="prompt-box" readonly>${escape(tutorPrompt())}</textarea><div class="actions"><button class="button" id="copy-tutor">复制本课指令 ↗</button><a href="#progress" class="button secondary">带回外教反馈</a></div><p class="muted small-text">只有真正分析了原始音频，才能评价发音和口语流畅度。外教指令包含课文，仍不能声称已观看或听过视频。</p></section>
    <section class="content-section"><h3>可选场景热身</h3>${list(lesson.practiceScenarios)}<details><summary>本周反馈模板</summary><textarea id="feedback-template" class="prompt-box" aria-label="本课 JSON 反馈模板" readonly>${escape(JSON.stringify(feedbackTemplate(lesson.id, selfReview), null, 2))}</textarea><div class="actions"><button id="copy-template" class="button secondary">复制空白模板</button></div></details></section>`;
}

function progressView() {
  const record = progress.records.find(item => item.lessonId === lesson.id);
  const statusLabel = { not_assessed: '等待学习反馈', needs_practice: '继续练习', completed: '已复核完成', passed: '已复核完成' }[record?.status] || '等待学习反馈';
  return `<section class="content-section"><div class="status-row"><h3>本周学习记录</h3><span class="badge neutral">${statusLabel}</span></div><p class="muted">${escape(record?.summary || '尚无正式记录。')}</p>${scoreCards(record?.scores)}<p class="small-text muted">${record?.total != null ? `正式总分：${escape(record.total)} / 100` : '总分：未评估'} · ${record?.reviewedAt ? `复核日期：${escape(record.reviewedAt)}` : '暂无复核日期'}</p>${record?.history?.length ? `<details><summary>历史学习反馈</summary>${record.history.map(item => `<p>${escape(item.assessedAt)} · ${escape(item.summary)}</p>`).join('')}</details>` : ''}</section>
    <section class="content-section"><h3>带回本周外教反馈</h3><p class="muted">粘贴 GPT 的 JSON 报告，在这里检查并备份，再发回我们的对话。结合你的难易评价和对话表现复核后，我会记录调整建议；你确认本周完成后，再更新进度。需要换简单的视频时，不必等到过关。</p><label class="form-label" for="feedback-input">第 ${escape(lesson.week)} 周 · 外教报告</label><textarea class="prompt-box feedback-box" id="feedback-input" spellcheck="false" placeholder="粘贴外教填写的完整 JSON 报告…">${escape(feedbackText)}</textarea><div class="actions"><button class="button" id="validate-feedback">校验报告</button><button class="button secondary" id="save-feedback">暂存本浏览器</button><button class="button secondary" id="download-feedback">下载 JSON</button></div><div id="feedback-result" class="feedback-result" role="status" aria-live="polite"></div><p class="notice">这里仅检查报告格式和证据是否完整；调整建议须回到对话中复核。暂存报告不会自动更新进度。</p><details><summary>如何调整课程与保存反馈</summary><p>根据简单／适合／困难、具体卡点、字幕与倍速条件，以及外教对话中的表现，选择降低难度、保持、提高一点或重练。一次对话不能确定完整 CEFR 等级。不设固定分数门槛；没有音频则发音与流畅度留空。</p><p>报告暂存仅保留在本浏览器。换设备可粘贴下载的 JSON 恢复。公开记录只保留脱敏摘要，不提交录音、公司机密或个人原始报告。</p><a href="./docs/tutor-rules.md" class="inline-link">完整外教规则 ↗</a></details></section>`;
}

function updateJourney() {
  const state = learningProgress(lessons, progress);
  document.querySelector('#passed-weeks').textContent = state.completed;
  document.querySelector('#progress-percent').textContent = `${state.percent}%`;
  const bar = document.querySelector('#learning-progress');
  bar.max = state.total; bar.value = state.completed;
  document.querySelector('.progress-number > span').textContent = `/ ${state.total} 周`;
  document.querySelector('#progress-description').textContent = `已复核完成 ${state.completed} 周。${state.completed === state.total ? '半年计划已完成，可以回顾学习成果。' : '根据学习反馈调整下一课，不按日期自动推进。'}`;
  document.querySelector('#week-label').textContent = `WEEK ${String(lesson.week).padStart(2, '0')} / ${weekDates(progress.learner.startDate, lesson.week)}`;
  document.querySelector('#week-title').textContent = lesson.title;
  document.querySelector('#week-summary').textContent = lesson.summary;
  const record = progress.records.find(item => item.lessonId === lesson.id);
  document.querySelector('#week-status').textContent = ['passed', 'completed'].includes(record?.status) && record.reviewedAt ? '已复核完成' : record?.status === 'needs_practice' ? '继续补练' : '等待学习反馈';
}

function showFeedback(result) {
  const element = document.querySelector('#feedback-result');
  if (!element) return;
  element.classList.toggle('error', !result.valid);
  if (!result.valid) { element.innerHTML = `<strong>报告需要修正</strong>${list(result.errors)}`; return; }
  const report = result.report;
  const adjustment = { easier: '降低一点难度', same: '保持难度', harder: '提高一点难度', revisit: '重练当前内容', incomplete: '补充观察' };
  const status = report.schemaVersion === 2 ? `反馈格式有效 · 建议${adjustment[report.recommendation]}，待讨论复核` : result.eligible && report.recommendation === 'pass' ? '符合过关建议门槛，待人工复核' : '报告格式有效，仍需补练或补测';
  element.innerHTML = `<strong>${status}</strong><p class="small-text">外教对话日期：${escape(report.assessedAt)} · ${report.mode === 'audio' ? '音频会话' : '文字会话'} · ${report.audioEvidence ? '报告声明已分析原始音频' : '无原始音频分析依据'}</p>${report.schemaVersion === 2 ? `<p>调整依据：${escape(report.adjustmentReason)}</p>` : ''}${scoreCards(report.scores)}<p style="margin-top:14px">${result.total === null ? '总分未计算：存在未评估项目。' : `外教报告总分：${result.total} / 100（非正式记录）`}</p>${report.nextPractice.length ? `<strong>下一步练习</strong>${list(report.nextPractice)}` : ''}<p class="small-text">把报告发回项目维护对话，核对证据后再更新正式结果。</p>`;
}

function bindEvents() {
  const mediaFailed = () => { document.querySelector('#video-help').textContent = '视频暂时加载失败，请使用下方官方课程或直接视频链接；也可先阅读课文。'; };
  document.querySelector('video')?.addEventListener('error', mediaFailed);
  document.querySelector('video source')?.addEventListener('error', mediaFailed);
  {
    document.querySelector('#toggle-translation').addEventListener('click', event => {
      const hidden = event.currentTarget.getAttribute('aria-pressed') !== 'true';
      event.currentTarget.setAttribute('aria-pressed', String(hidden));
      event.currentTarget.textContent = hidden ? '显示中文' : '隐藏中文';
      document.querySelectorAll('.translation').forEach(item => { item.hidden = hidden; });
    });
    const form = document.querySelector('#quiz-form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const results = gradeQuiz(lesson.quiz, Object.fromEntries(new FormData(form)));
      for (const result of results) document.querySelector(`#result-${result.id}`).innerHTML = `<p class="answer-result ${result.correct ? 'correct' : 'incorrect'}">${result.correct ? '✓ 回答正确' : result.answered ? '再想一想' : '尚未作答'} · ${escape(result.explanation)}</p>`;
      document.querySelector('#quiz-summary').textContent = `${results.filter(result => result.correct).length} / ${results.length} 题正确。此成绩只用于知识练习，不记录为口语成绩。`;
    });
    form.addEventListener('reset', () => {
      lesson.quiz.forEach(question => { document.querySelector(`#result-${question.id}`).textContent = ''; });
      document.querySelector('#quiz-summary').textContent = '';
    });
  }
  {
    for (const [button, textarea] of [['copy-tutor', 'tutor-prompt'], ['copy-template', 'feedback-template']]) document.querySelector(`#${button}`).addEventListener('click', () => { const element = document.querySelector(`#${textarea}`); copyText(element.value, element); });
    document.querySelector('#self-review-form').addEventListener('input', () => {
      const form = document.querySelector('#self-review-form');
      const data = new FormData(form);
      selfReview = {
        watched: data.get('watched') === 'on', difficulty: data.get('difficulty') || null,
        difficulties: data.getAll('difficulties'), notes: data.get('notes') || '',
        captions: data.get('captions') || null,
        playbackRate: data.get('playbackRate') ? Number(data.get('playbackRate')) : null
      };
      if (!selfReview.watched) {
        selfReview.difficulty = null;
        form.querySelectorAll('[name="difficulty"]').forEach(input => { input.checked = false; });
      }
      form.querySelectorAll('[name="difficulty"]').forEach(input => { input.disabled = !selfReview.watched; });
      const saved = saveLocal(`speak-video-review-${lesson.id}`, JSON.stringify(selfReview));
      document.querySelector('#self-review-status').textContent = saved ? '自评已暂存本浏览器，并加入外教指令；不改变学习进度。' : '未能保存，请手动复制外教指令备份。';
      document.querySelector('#tutor-prompt').value = tutorPrompt();
      document.querySelector('#feedback-template').value = JSON.stringify(feedbackTemplate(lesson.id, selfReview), null, 2);
    });
  }
  {
    const input = document.querySelector('#feedback-input');
    input.addEventListener('input', () => { feedbackText = input.value; document.querySelector('#feedback-result').textContent = ''; });
    document.querySelector('#validate-feedback').addEventListener('click', () => showFeedback(parseReport(input.value, lesson.id)));
    document.querySelector('#save-feedback').addEventListener('click', () => {
      const result = parseReport(input.value, lesson.id);
      showFeedback(result);
      if (result.valid && saveLocal(`speak-feedback-${lesson.id}`, JSON.stringify(result.report, null, 2))) toast('反馈已暂存在此浏览器，正式记录未变更。');
    });
    document.querySelector('#download-feedback').addEventListener('click', () => downloadReport(input.value));
    if (feedbackText) showFeedback(parseReport(feedbackText, lesson.id));
  }
}

const tabViews = ['lesson', 'language', 'quiz', 'tutor', 'progress'];
function route(navigate = false) {
  const [requested, anchor] = location.hash.slice(1).split('/');
  let next = tabViews.includes(requested) ? requested : 'lesson';
  if (requested === 'lesson' && ['words', 'grammar', 'pronunciation'].includes(anchor)) next = 'language';
  if (requested === 'lesson' && anchor === 'quiz') next = 'quiz';
  view = next;
  document.querySelectorAll('[data-view]').forEach(tab => {
    const active = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.querySelector(`#panel-${tab.dataset.view}`).hidden = !active;
  });
  document.title = '码农口语提升指南';
  if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  else if (navigate) {
    document.querySelector(`#tab-${view}`).focus({ preventScroll: true });
    document.querySelector('.tabs').scrollIntoView({ block: 'start' });
  }
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  for (const tab of tabs) {
    tab.addEventListener('click', () => { history.replaceState(null, '', `#${tab.dataset.view}`); route(); });
    tab.addEventListener('keydown', event => {
      let index = tabs.indexOf(tab);
      if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') index = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault(); tabs[index].click(); tabs[index].focus();
    });
  }
}

async function load(path, json = true) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`);
  return json ? response.json() : response.text();
}

try {
  [lessons, progress, rules] = await Promise.all([load('../data/lessons.json'), load('../data/progress.json'), load('../docs/tutor-rules.md', false)]);
  const selectedId = new URL(location.href).searchParams.get('lesson');
  lesson = lessons.find(item => item.id === selectedId) || lessons.at(-1);
  if (!lesson || !Array.isArray(progress.records)) throw new Error('课程或记录格式不完整。');
  try { const saved = JSON.parse(readLocal(`speak-video-review-${lesson.id}`) || '{}'); selfReview = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}; } catch { selfReview = {}; }
  if (lesson.source.status !== 'verified') selfReview = {};
  feedbackText = readLocal(`speak-feedback-${lesson.id}`) || '';
  updateJourney();
  const selector = document.querySelector('#lesson-select');
  selector.innerHTML = lessons.map(item => `<option value="${escape(item.id)}" ${item.id === lesson.id ? 'selected' : ''}>第 ${escape(item.week)} 周 · ${escape(item.title)}</option>`).join('');
  selector.addEventListener('change', () => {
    const target = new URL(location.href);
    target.searchParams.set('lesson', selector.value);
    target.hash = 'lesson';
    location.assign(target.href);
  });
  const renderers = { lesson: lessonView, language: languageView, quiz: quizView, tutor: tutorView, progress: progressView };
  app.innerHTML = tabViews.map(name => `<div id="panel-${name}" role="tabpanel" aria-labelledby="tab-${name}" tabindex="0" hidden>${renderers[name]()}</div>`).join('');
  bindEvents();
  setupTabs();
  route();
  window.addEventListener('hashchange', () => route(true));
} catch (error) {
  app.innerHTML = `<section class="loading"><h3>学习内容暂时无法加载</h3><p>${escape(error.message)}</p><p>请通过 HTTP 服务打开网页，并确认 data 与 docs 目录和网页一起部署。</p><button class="button" id="retry-load">重新加载</button></section>`;
  document.querySelector('#retry-load').addEventListener('click', () => location.reload());
}
