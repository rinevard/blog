---
title: 用 Tracy 分析动画编辑器的性能瓶颈
toc: true
date: 2026-04-13 12:50:38
tags:
categories:
  - godot
---

在给 Godot 加入拖动动画关键帧显示时间标签的功能时，维护者提醒我要考虑因导入动画而存在大量 key 的情况。于是我去 Mixamo 找了个动画导入到 Godot，然后发现选中和拖动松手都超级卡！

下图非静止画面：

<img src="/images/learning/godot/before.gif">

然后来看看我优化后的结果吧，效果挺明显的😎：

<img src="/images/learning/godot/after.gif">

接下来我们来看看如何找到性能瓶颈，又如何优化。

## 眼观代码

首先我们注意到拖动松手时有一个明显的卡顿，因此先寻找松手时的代码。代码在 `void AnimationTrackEditor::_move_selection_commit`。它把删除 key、重新插入 key 等函数加到了 `EditorUndoRedoManager` 中，并在结尾做了 commit。

为什么要加到撤销/重做系统中而不是直接调用函数呢？因为系统要知道哪些操作应该打包在一起，才能知道 Ctrl+Z 应该撤销什么、Ctrl+Y 应该重做什么。

插点调试语句就能知道结尾的 commit 是性能瓶颈。进一步深入可以发现调用链条是

`EditorUndoRedoManager::commit_action` -> `UndoRedo::commit_action` -> `UndoRedo::_redo` -> `UndoRedo::_process_operation_list`

我们也能发现 _process_operation_list 就是撤销/重做系统实际执行传入的函数的地方，那接下来就轮到 Tracy 上场了！

## Tracy 简介

在 github.com/wolfpld/tracy 下载 tracy。我们要去代码库的 release 里下载 windows-0.13.1.zip 和 Source code，前者是 GUI 界面，后者用于和被分析的代码一起编译以支持 GUI 界面的分析。

使用 Tracy 时最常用的手段是代码插桩，如下所示：

```cpp
void UpdateFrame() {
    ZoneScopedN("UpdateFrame");
    
    {
        ZoneScopedN("Physics Update");
        // ... 物理模拟代码 ...
    }
    
    {
        ZoneScopedN("Render Data");
        // ... 渲染准备代码 ...
    }

    // 其他代码
}
```

ZoneScoped 利用了 C++ 的局部变量生命周期机制，在执行到 ZoneScoped 时启动计时，在其生命周期结束时停止计时。常用函数为 `ZoneScopedN("Your Custom Name")`。

对上面的例子来说，记录的结果可能如下所示：

<img src="/images/learning/godot/tracy-visualize-example.png">

也就是说 Tracy 记录了每个作用域的运行时间。同时由于一个作用域里可能有其他作用域，作用域的运行时间也就可以被细分为不同时间段。

由于 Godot 需要支持不同的性能分析器，它用 GodotProfileZone 宏对插桩统一做了封装，语法为 `GodotProfileZone("Your Custom Name")`。

在插桩后，我们可以用 `scons platform=windows dev_build=yes profiler=tracy profiler_path="path/to/tracy_source_code"` 重新编译 Godot。

## 使用 Tracy

我们之前提到，_process_operation_list 是实际执行函数的地方，因此我们可以在这里多插几个桩。

```cpp
void UndoRedo::_process_operation_list(List<Operation>::Element *E, bool p_execute) {
    GodotProfileZone("UndoRedo::_process_operation_list"); // 插桩1

    // ...省略部分代码...

    switch (op.type) {
        case Operation::TYPE_METHOD: {
            GodotProfileZone("Operation::TYPE_METHOD"); // 插桩2
            if (p_execute) {
                GodotProfileZone("Operation::TYPE_METHOD_execute"); // 插桩3
                    
                // ...省略部分代码...
            }

            if (method_callback) {
                GodotProfileZone("Operation::TYPE_METHOD_callback"); // 插桩4

                // ...省略部分代码...
            }
        } break;
    
        // ...省略部分代码...
    }
}
```

编译然后跑一下，我们就能看出性能瓶颈确实在 _process_operation_list 上，具体来说是在 TYPE_METHOD_execute 里。单个 TYPE_METHOD_execute 在 5ms 左右，_process_operation_list 产生了大量对它的调用，因此耗时较长。

TYPE_METHOD_execute 所在的作用域在执行之前 _move_selection_commit 传入的函数。为了进一步知道性能瓶颈来自 undo/redo 系统本身还是动画编辑器传入的函数，我们可以对这些函数插桩，结果如下图所示：

<img src="/images/learning/godot/tracy-final.png">

这样一来我们就知道瓶颈来源于 `AnimationTrackEditor::_update_key_edit` 了。更具体一点，瓶颈来源于 _move_selection_commit 对 `AnimationTrackEditor::_select_at_anim` 的大量调用，而 _select_at_anim 内部调用了 _update_key_edit。

## 优化瓶颈

我们来看看 _update_key_edit 的代码：

```cpp
void AnimationTrackEditor::_update_key_edit() {
	_clear_key_edit();
	if (animation.is_null()) {
		return;
	}

	if (selection.size() == 1) {
		key_edit = memnew(AnimationTrackKeyEdit);
		key_edit->animation = animation;
		key_edit->animation_read_only = read_only;
		key_edit->track = selection.front()->key().track;
		key_edit->use_fps = timeline->is_using_fps();
		key_edit->editor = this;

		int key_id = selection.front()->key().key;
		if (key_id >= animation->track_get_key_count(key_edit->track)) {
			_clear_key_edit();
			return; // Probably in the process of rearranging the keys.
		}
		float ofs = animation->track_get_key_time(key_edit->track, key_id);
		key_edit->key_ofs = ofs;
		key_edit->root_path = root;

		NodePath np;
		key_edit->hint = _find_hint_for_track(key_edit->track, np);
		key_edit->base = np;

		EditorNode::get_singleton()->push_item(key_edit);
	} else if (selection.size() > 1) {
		multi_key_edit = memnew(AnimationMultiTrackKeyEdit);
		multi_key_edit->animation = animation;
		multi_key_edit->animation_read_only = read_only;
		multi_key_edit->editor = this;

		RBMap<int, List<float>> key_ofs_map;
		RBMap<int, NodePath> base_map;
		int first_track = -1;
		for (const KeyValue<SelectedKey, KeyInfo> &E : selection) {
			int track = E.key.track;
			if (first_track < 0) {
				first_track = track;
			}

			if (!key_ofs_map.has(track)) {
				key_ofs_map[track] = List<float>();
				base_map[track] = NodePath();
			}

			int key_id = E.key.key;
			if (key_id >= animation->track_get_key_count(track)) {
				_clear_key_edit();
				return; // Probably in the process of rearranging the keys.
			}
			key_ofs_map[track].push_back(animation->track_get_key_time(track, E.key.key));
		}
		multi_key_edit->key_ofs_map = key_ofs_map;
		multi_key_edit->base_map = base_map;
		multi_key_edit->hint = _find_hint_for_track(first_track, base_map[first_track]);
		multi_key_edit->use_fps = timeline->is_using_fps();
		multi_key_edit->root_path = root;

		EditorNode::get_singleton()->push_item(multi_key_edit);
	}
}
```

它的职责主要是根据当前选中的关键帧（selection）新建一个 Object 以便编辑器编辑。`EditorNode::get_singleton()->push_item` 会告知 InspectorDock、SignalsDock 等组件当前正在编辑的对象。

我们回顾一下，瓶颈来源于 _move_selection_commit 对 `AnimationTrackEditor::_select_at_anim` 的大量调用，而 _select_at_anim 内部调用了 _update_key_edit。我们再来看看 _select_at_anim 的代码：

```cpp
void AnimationTrackEditor::_select_at_anim(const Ref<Animation> &p_anim, int p_track, float p_pos) {
	if (animation != p_anim) {
		return;
	}

	int idx = animation->track_find_key(p_track, p_pos, Animation::FIND_MODE_APPROX);
	ERR_FAIL_COND(idx < 0);

	SelectedKey sk;
	sk.track = p_track;
	sk.key = idx;
	KeyInfo ki;
	ki.pos = p_pos;

	selection.insert(sk, ki);
	_update_key_edit();

	marker_edit->_clear_selection(marker_edit->is_selection_active());
}
```

它只是把选中的关键帧加入了 selection 中。

## 方案抉择

这样一来，我们就有了方案1：把 `_update_key_edit` 从 `_select_at_anim` 中抽离出来，在原本调用它的地方手动调用 `_update_key_edit`。

这样一来拖动松手的问题就解决了。不过框选松手也卡卡的。框选松手调用了 `_key_selected`，而它也调用了 `_update_key_edit`，所以我们也要对 `_key_selected` 进行抽离。

这个方案的问题在于改变了函数语义，同时对代码的改动量较大。如果我们抽离了 `_update_key_edit`，那么 `_select_at_anim` 和 `_key_selected` 的语义就不再包含对编辑器的更新，同时每个调用了它们的地方都要手动调用 `_update_key_edit`。

嗯...也不是不行吧，不过有没有更简单轻松一点的办法？

那我们有方案2：给这两个函数加默认参数 `bool p_update_key_edit=true`，然后把代码改成

```cpp
if (p_update_key_edit) {
    _update_key_edit();
}
```

我们可以在需要的时候把这个参数设为 false 并手动调用 `_update_key_edit`。

这个方案对代码的改动量较小，函数语义的改变也不算太多，不过未来人看到 `bool p_update_key_edit` 这个参数后估计还是会迷糊一会儿，不知道为什么要引入它。

<img src="/images/learning/godot/angry_cow.jpg" width="50%" height="auto">

行吧，那我考虑考虑。还有别的办法吗？

我们还有方案3：把 `_update_key_edit` 本体改成延时更新。

具体来说，由于 `_update_key_edit` 只是根据 selection 的值更新编辑器当前编辑的内容，一帧内更新多次也没有太大意义，我们完全可以检查这一帧是否有过更新请求，如果有就在下一帧进行一次更新，如果没有就不更新。

```cpp
void AnimationTrackEditor::_update_key_edit() {
	if (update_key_edit_pending) {
		return;
	}
	update_key_edit_pending = true;
	callable_mp(this, &AnimationTrackEditor::_update_key_edit_callback).call_deferred();
}

void AnimationTrackEditor::_update_key_edit_callback() {
	update_key_edit_pending = false;

    // ...真正的逻辑...
}    
```

这个方案对代码的改动量极少，问题在于 `_update_key_edit` 在下一帧才会更新编辑器编辑的对象，可能与别的地方的更新有时序冲突。不过前两个方案的问题可以说是一定存在，这个方案的问题只是推测存在，所以就用这个方案吧。

<img src="/images/learning/godot/buguro.png" width="50%" height="auto">
