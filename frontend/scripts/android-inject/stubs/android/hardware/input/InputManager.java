package android.hardware.input;

import android.view.InputEvent;

// Compile-time stub for a @hide class: the device's framework provides it, and
// a process started by app_process from the shell may call it, as `input` does.
public final class InputManager {
    public static final int INJECT_INPUT_EVENT_MODE_ASYNC = 0;

    public static InputManager getInstance() {
        throw new RuntimeException("stub");
    }

    public boolean injectInputEvent(InputEvent event, int mode) {
        throw new RuntimeException("stub");
    }
}
