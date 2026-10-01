Attribute VB_Name = "GroupImg"
Attribute VB_Base = "0{AB96E1AA-4CB4-45EA-B15D-23FC9DC21CF7}{BD0661DD-C54F-4248-97DD-4CAAC2B3BB42}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Private Sub btnOK_Click()
    
    Dim img As Shape
    Dim shp As Shape
    Dim tmpChart As ChartObject
    Dim imgName As String
    Dim imgFile As String
    
    
    ' Check number of inserted images and group them by need
    If newImgs.Count > 1 Then
        ReDim imgArray(1 To newImgs.Count)
        For i = 1 To newImgs.Count
            imgArray(i) = newImgs(i).Name
        Next i

        Set img = ws.Shapes.Range(imgArray).Group
        
    ElseIf newImgs.Count = 1 Then
        Set img = ws.Shapes(newImgs(1).Name)
        
    Else
        MsgBox "Es wurde kein Produktbild eingefügt.", vbExclamation
        CloseUserForms
    End If
    
    
    ' Check whether there is an image
    If Not img Is Nothing Then
        img.CopyPicture Appearance:=xlScreen, Format:=xlPicture
        
    Else
        ' Cancel process and delete inserted images
        For Each shp In newImgs
            shp.Delete
        Next shp
        
        BlockEditing
        
        Me.Hide
        MsgBox "Es wurde kein Produktbild eingefügt.", vbExclamation
        CloseUserForms
    End If
          
    
    Application.ScreenUpdating = False
    
    
    ' Choose file name
    imgName = "Image_" & (targetCell.row - tbl.HeaderRowRange.row) & ".png"
    imgFile = saveFolder & imgName
        
    ' Export image
    Set tmpChart = ActiveSheet.ChartObjects.Add(0, 0, img.Width * 5, img.Height * 5)
        
    With tmpChart
        .Activate
        .Chart.Paste
        .Chart.ChartArea.Border.LineStyle = xlNone
        .Chart.Export Filename:=imgFile, FilterName:="PNG"
        .Delete
    End With
        
    ' Insert file name
    targetCell.Value = imgName
    img.Delete
      
      
    BlockEditing
      
    Me.Hide
    
    ' Delete insert button
    currentBtn.Delete
    
    
    CreateDeleteBtn
    
    Application.ScreenUpdating = True
    
    MsgBox "Das Produktbild wurde erfolgreich eingefügt.", vbInformation
    
    CloseUserForms
    
End Sub

Private Sub btnAddMore_Click()

    ListShapes
    Me.Hide
    NewImg.ChooseImg
    
End Sub

Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)
    
    ' Unload all UserForms if GroupImg is closed
    If CloseMode = vbFormControlMenu Then
        If newImgs.Count > 0 Then
            For Each shp In newImgs
                shp.Delete
            Next shp
        End If
        
        CloseUserForms
        BlockEditing
    End If
    
End Sub

