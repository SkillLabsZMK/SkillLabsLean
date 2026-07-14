.class public Lde/zmk/kaffeekasse/Bridge;
.super Ljava/lang/Object;
.source "Bridge.java"


# instance fields
.field private final act:Landroid/app/Activity;


# direct methods
.method public constructor <init>(Landroid/app/Activity;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lde/zmk/kaffeekasse/Bridge;->act:Landroid/app/Activity;

    return-void
.end method


# virtual methods
.method public setBrightness(F)V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    iget-object v0, p0, Lde/zmk/kaffeekasse/Bridge;->act:Landroid/app/Activity;

    new-instance v1, Lde/zmk/kaffeekasse/BrightnessRunnable;

    iget-object v2, p0, Lde/zmk/kaffeekasse/Bridge;->act:Landroid/app/Activity;

    invoke-direct {v1, v2, p1}, Lde/zmk/kaffeekasse/BrightnessRunnable;-><init>(Landroid/app/Activity;F)V

    invoke-virtual {v0, v1}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method
