package android.view;

// Compile-time stub: the device's framework provides the real class.
public final class MotionEvent extends InputEvent {
    public static final int ACTION_DOWN = 0;
    public static final int ACTION_UP = 1;
    public static final int ACTION_MOVE = 2;

    public static MotionEvent obtain(long downTime, long eventTime, int action, float x, float y, int metaState) {
        throw new RuntimeException("stub");
    }

    @Override
    public void setSource(int source) {
        throw new RuntimeException("stub");
    }

    public void recycle() {
        throw new RuntimeException("stub");
    }
}
