.class public Lde/zmk/kaffeekasse/BrightnessRunnable;
.super Ljava/lang/Object;
.source "BrightnessRunnable.java"

# interfaces
.implements Ljava/lang/Runnable;


# instance fields
.field private final act:Landroid/app/Activity;

.field private final value:F


# direct methods
.method public constructor <init>(Landroid/app/Activity;F)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lde/zmk/kaffeekasse/BrightnessRunnable;->act:Landroid/app/Activity;

    iput p2, p0, Lde/zmk/kaffeekasse/BrightnessRunnable;->value:F

    return-void
.end method


# virtual methods
.method public run()V
    .locals 3

    iget-object v0, p0, Lde/zmk/kaffeekasse/BrightnessRunnable;->act:Landroid/app/Activity;

    invoke-virtual {v0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object v0

    invoke-virtual {v0}, Landroid/view/Window;->getAttributes()Landroid/view/WindowManager$LayoutParams;

    move-result-object v1

    iget v2, p0, Lde/zmk/kaffeekasse/BrightnessRunnable;->value:F

    iput v2, v1, Landroid/view/WindowManager$LayoutParams;->screenBrightness:F

    invoke-virtual {v0, v1}, Landroid/view/Window;->setAttributes(Landroid/view/WindowManager$LayoutParams;)V

    return-void
.end method
