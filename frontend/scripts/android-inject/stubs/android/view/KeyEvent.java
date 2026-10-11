package android.view;

// Compile-time stub: the device's framework provides the real class.
public class KeyEvent extends InputEvent {
    public static final int ACTION_DOWN = 0;
    public static final int ACTION_UP = 1;

    public KeyEvent(long downTime, long eventTime, int action, int code, int repeat, int metaState) {
        throw new RuntimeException("stub");
    }

    public final int getAction() {
        throw new RuntimeException("stub");
    }

    public final int getKeyCode() {
        throw new RuntimeException("stub");
    }

    public final int getMetaState() {
        throw new RuntimeException("stub");
    }

    @Override
    public final void setSource(int source) {
        throw new RuntimeException("stub");
    }
}
