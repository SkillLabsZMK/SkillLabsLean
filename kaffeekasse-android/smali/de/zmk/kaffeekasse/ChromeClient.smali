.class public Lde/zmk/kaffeekasse/ChromeClient;
.super Landroid/webkit/WebChromeClient;
.source "ChromeClient.java"


# instance fields
.field private final act:Lde/zmk/kaffeekasse/MainActivity;


# direct methods
.method public constructor <init>(Lde/zmk/kaffeekasse/MainActivity;)V
    .locals 0

    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V

    iput-object p1, p0, Lde/zmk/kaffeekasse/ChromeClient;->act:Lde/zmk/kaffeekasse/MainActivity;

    return-void
.end method


# virtual methods
.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .locals 4

    iget-object v0, p0, Lde/zmk/kaffeekasse/ChromeClient;->act:Lde/zmk/kaffeekasse/MainActivity;

    iget-object v1, v0, Lde/zmk/kaffeekasse/MainActivity;->fileCallback:Landroid/webkit/ValueCallback;

    if-eqz v1, :cond_0

    const/4 v2, 0x0

    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    :cond_0
    iput-object p2, v0, Lde/zmk/kaffeekasse/MainActivity;->fileCallback:Landroid/webkit/ValueCallback;

    new-instance v1, Landroid/content/Intent;

    const-string v2, "android.intent.action.GET_CONTENT"

    invoke-direct {v1, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v2, "android.intent.category.OPENABLE"

    invoke-virtual {v1, v2}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;

    const-string v2, "*/*"

    invoke-virtual {v1, v2}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;

    const/16 v3, 0x2a

    invoke-virtual {v0, v1, v3}, Lde/zmk/kaffeekasse/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V

    const/4 v3, 0x1

    return v3
.end method
