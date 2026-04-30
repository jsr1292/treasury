<script lang="ts">
  import { applyTransforms, previewTransforms, getTransformTypes, TRANSFORM_DESCRIPTIONS, getDefaultParams, parseCoalesceFields, parseLookupTable } from '$lib/connector/transforms';
  import type { TransformStep } from '$lib/connector/transforms';

  interface Props {
    fieldKey: string;
    source: string;
    transforms: TransformStep[];
    sampleValue?: any;
    sampleRow?: any;
    onchange?: (transforms: TransformStep[]) => void;
  }

  let {
    fieldKey,
    source,
    transforms = $bindable([]),
    sampleValue,
    sampleRow,
    onchange,
  }: Props = $props();

  let expanded = $state(false);
  let addingType = $state<string | null>(null);
  let testResult = $state<{ steps: { type: string; input: any; output: any }[]; final: any } | null>(null);
  let editingIndex = $state<number | null>(null);

  const availableTypes = getTransformTypes();

  function getParams(step: TransformStep): Record<string, any> {
    return step.params ?? {};
  }

  function updateParam(index: number, paramKey: string, value: any) {
    transforms = transforms.map((s, i) => {
      if (i !== index) return s;
      return { ...s, params: { ...(s.params ?? {}), [paramKey]: value } };
    });
    onchange?.(transforms);
  }

  function removeStep(index: number) {
    transforms = transforms.filter((_, i) => i !== index);
    onchange?.(transforms);
  }

  function addStep(type: string) {
    const params = getDefaultParams(type);
    const newStep: TransformStep = { type, params };
    transforms = [...transforms, newStep];
    onchange?.(transforms);
    addingType = null;
    editingIndex = transforms.length - 1;
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...transforms];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    transforms = next;
    onchange?.(transforms);
  }

  function moveDown(index: number) {
    if (index === transforms.length - 1) return;
    const next = [...transforms];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    transforms = next;
    onchange?.(transforms);
  }

  function runTest() {
    if (sampleValue === undefined && !sampleRow) return;
    const preview = previewTransforms(sampleValue ?? sampleRow, transforms, sampleRow);
    testResult = preview;
  }

  function clearTest() {
    testResult = null;
  }

  function formatValue(val: any): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  function renderParamValue(step: TransformStep, key: string): any {
    const val = step.params?.[key];
    if (key === 'table' && typeof val === 'string') {
      try { return JSON.parse(val); } catch { return {}; }
    }
    if (key === 'fields' && typeof val === 'string') {
      return parseCoalesceFields(val);
    }
    return val;
  }
</script>

<div style="margin-top: 10px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
  <!-- Header -->
  <button
    onclick={() => expanded = !expanded}
    style="width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: {expanded ? 'rgba(201,168,76,0.06)' : 'var(--bg-surface)'}; border: none; border-bottom: 1px solid {expanded ? 'var(--border)' : 'transparent'}; cursor: pointer; text-align: left; transition: all 0.15s;"
  >
    <span style="font-size: 10px; color: var(--text3);">
      {expanded ? '▼' : '▶'}
    </span>
    <span style="font-size: 10px; font-weight: 600; color: var(--gold);">⚙ Transforms</span>
    {#if transforms.length > 0}
      <span style="font-size: 9px; padding: 1px 6px; border-radius: 10px; background: rgba(201,168,76,0.15); color: var(--gold);">{transforms.length}</span>
    {/if}
    <span style="font-size: 9px; color: var(--text3); margin-left: auto;">
      {fieldKey} ← "{source}"
    </span>
  </button>

  {#if expanded}
    <div style="padding: 12px;">
      <!-- Pipeline visualization -->
      {#if transforms.length > 0}
        <div style="margin-bottom: 10px;">
          <!-- Sample input -->
          <div style="display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 8px; color: var(--text3); width: 14px; padding-top: 2px;">IN</span>
            <code style="font-size: 9px; padding: 3px 7px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text2); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace;">
              {formatValue(sampleValue)}
            </code>
          </div>

          <!-- Transform steps -->
          {#each transforms as step, i}
            {@const desc = TRANSFORM_DESCRIPTIONS[step.type]}
            {@const isEditing = editingIndex === i}
            <div style="display: flex; align-items: {isEditing ? 'flex-start' : 'center'}; gap: 6px; margin: 2px 0;">
              <!-- Arrow + step -->
              <div style="display: flex; align-items: center; gap: 6px; flex: 1; flex-wrap: wrap;">
                <span style="font-size: 9px; color: var(--gold);">↓</span>
                <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
                  <span style="font-size: 10px;">{desc?.icon ?? '⚙'}</span>
                  <span style="font-size: 9px; font-weight: 600; color: var(--text);">{desc?.label ?? step.type}</span>
                  {#if !isEditing}
                    <!-- Compact param summary -->
                    {#if step.type === 'regex_replace'}
                      <code style="font-size: 8px; color: var(--text3); font-family: monospace;">/ {step.params?.pattern ?? ''} / → "{step.params?.replacement ?? ''}"</code>
                    {:else if step.type === 'regex_extract'}
                      <code style="font-size: 8px; color: var(--text3); font-family: monospace;">/{step.params?.pattern ?? ''}/</code>
                    {:else if step.type === 'number_format'}
                      <span style="font-size: 8px; color: var(--text3);">{step.params?.format ?? 'US'}</span>
                    {:else if step.type === 'currency_extract'}
                      <span style="font-size: 8px; color: var(--text3);">→ {step.params?.default ? `default: ${step.params.default}` : ''}</span>
                    {:else if step.type === 'default'}
                      <span style="font-size: 8px; color: var(--text3);">→ "{step.params?.fallback ?? ''}"</span>
                    {:else if step.type === 'lookup'}
                      <span style="font-size: 8px; color: var(--text3);">×{Object.keys(step.params?.table ?? {}).length} keys</span>
                    {:else if step.type === 'coalesce'}
                      <span style="font-size: 8px; color: var(--text3);">{step.params?.fields ?? ''}</span>
                    {:else if step.type === 'template'}
                      <code style="font-size: 8px; color: var(--text3); font-family: monospace;">"{step.params?.template ?? ''}"</code>
                    {/if}
                  {/if}
                </div>

                <!-- Step controls -->
                <div style="display: flex; gap: 2px; align-items: center;">
                  <button onclick={() => moveUp(i)} disabled={i === 0} style="font-size: 8px; padding: 1px 4px; border: 1px solid var(--border); border-radius: 3px; background: transparent; color: var(--text3); cursor: pointer; opacity: {i === 0 ? '0.3' : '1'};">↑</button>
                  <button onclick={() => moveDown(i)} disabled={i === transforms.length - 1} style="font-size: 8px; padding: 1px 4px; border: 1px solid var(--border); border-radius: 3px; background: transparent; color: var(--text3); cursor: pointer; opacity: {i === transforms.length - 1 ? '0.3' : '1'};">↓</button>
                  <button onclick={() => editingIndex = isEditing ? null : i} style="font-size: 8px; padding: 1px 4px; border: 1px solid var(--border); border-radius: 3px; background: transparent; color: var(--text3); cursor: pointer;">✎</button>
                  <button onclick={() => removeStep(i)} style="font-size: 8px; padding: 1px 4px; border: 1px solid rgba(255,77,106,0.3); border-radius: 3px; background: transparent; color: var(--red); cursor: pointer;">✕</button>
                </div>
              </div>
            </div>

            <!-- Expanded param editor -->
            {#if isEditing && desc?.paramFields && desc.paramFields.length > 0}
              <div style="margin-left: 20px; margin-bottom: 6px; padding: 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px;">
                {#each desc.paramFields as pf}
                  <div style="margin-bottom: 6px;">
                    <label style="display: block; font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px;">
                      {pf.label} {#if pf.hint}<span style="font-weight: 400; text-transform: none; opacity: 0.7;">— {pf.hint}</span>{/if}
                    </label>
                    {#if pf.type === 'select'}
                      <select
                        value={step.params?.[pf.key] ?? (pf.key === 'format' ? 'US' : '')}
                        onchange={(e) => updateParam(i, pf.key, e.currentTarget.value)}
                        style="width: 100%; font-size: 10px; padding: 4px 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text);"
                      >
                        {#if pf.key === 'format'}
                          <option value="US">US (1,234.56)</option>
                          <option value="EU">EU (1.234,56)</option>
                        {/if}
                      </select>
                    {:else if pf.type === 'textarea'}
                      <textarea
                        value={step.params?.[pf.key] ?? ''}
                        oninput={(e) => updateParam(i, pf.key, e.currentTarget.value)}
                        placeholder={pf.placeholder}
                        rows={3}
                        style="width: 100%; font-size: 10px; padding: 4px 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text); resize: vertical; font-family: monospace;"
                      ></textarea>
                    {:else if pf.type === 'number'}
                      <input
                        type="number"
                        value={step.params?.[pf.key] ?? 0}
                        oninput={(e) => updateParam(i, pf.key, parseInt(e.currentTarget.value) || 0)}
                        style="width: 100%; font-size: 10px; padding: 4px 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text);"
                      />
                    {:else}
                      <input
                        type="text"
                        value={step.params?.[pf.key] ?? ''}
                        oninput={(e) => updateParam(i, pf.key, e.currentTarget.value)}
                        placeholder={pf.placeholder}
                        style="width: 100%; font-size: 10px; padding: 4px 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text); font-family: {pf.key === 'pattern' || pf.key === 'template' ? 'monospace' : 'inherit'};"
                      />
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          {/each}

          <!-- Output -->
          {#if testResult}
            <div style="display: flex; align-items: flex-start; gap: 6px; margin-top: 4px;">
              <span style="font-size: 8px; color: var(--green); width: 14px; padding-top: 2px;">OUT</span>
              <code style="font-size: 9px; padding: 3px 7px; background: rgba(0,229,160,0.08); border: 1px solid rgba(0,229,160,0.2); border-radius: 4px; color: var(--green); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace;">
                {formatValue(testResult.final)}
              </code>
            </div>
          {/if}
        </div>
      {:else}
        <div style="font-size: 9px; color: var(--text3); text-align: center; padding: 8px 0;">
          No transforms yet. Add one below to process this field.
        </div>
      {/if}

      <!-- Add transform step -->
      {#if addingType}
        <div style="margin-top: 8px; padding: 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px;">
          <div style="font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Choose transform type</div>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            {#each availableTypes as type}
              {@const desc = TRANSFORM_DESCRIPTIONS[type]}
              <button
                onclick={() => addStep(type)}
                style="display: flex; align-items: center; gap: 6px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 5px; background: var(--bg-card); cursor: pointer; text-align: left; transition: all 0.1s;"
                onmouseenter={(e) => e.currentTarget.style.borderColor = 'var(--gold)'}
                onmouseleave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style="font-size: 11px;">{desc?.icon ?? '⚙'}</span>
                <div>
                  <div style="font-size: 9px; font-weight: 600; color: var(--text);">{desc?.label ?? type}</div>
                  <div style="font-size: 8px; color: var(--text3);">{desc?.description ?? ''}</div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <button
          onclick={() => addingType = 'string'}
          style="margin-top: 6px; font-size: 9px; padding: 4px 10px; border: 1px dashed var(--border); border-radius: 5px; background: transparent; color: var(--text3); cursor: pointer; transition: all 0.1s; width: 100%;"
          onmouseenter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
          onmouseleave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}
        >
          + Add transform step
        </button>
      {/if}

      <!-- Test button -->
      {#if (sampleValue !== undefined || sampleRow) && addingType === null}
        <div style="margin-top: 8px; display: flex; gap: 6px; align-items: center;">
          <button
            onclick={runTest}
            style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--blue); border-radius: 4px; background: rgba(59,130,246,0.08); color: var(--blue); cursor: pointer;"
          >
            ▶ Test
          </button>
          {#if testResult}
            <button
              onclick={clearTest}
              style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 4px; background: transparent; color: var(--text3); cursor: pointer;"
            >
              Clear
            </button>
            <!-- Step-by-step preview -->
            {#each testResult.steps as s, i}
              <div style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: var(--text3);">
                <span style="color: var(--gold);">{TRANSFORM_DESCRIPTIONS[s.type]?.icon ?? '⚙'}</span>
                <span>{formatValue(s.input)}</span>
                <span>→</span>
                <span style="color: {s.output === null ? 'var(--red)' : 'var(--green)'};">{formatValue(s.output)}</span>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
