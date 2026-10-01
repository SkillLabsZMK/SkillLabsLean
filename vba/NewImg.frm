Attribute VB_Name = "NewImg"
Attribute VB_Base = "0{BF2819DA-0D4D-4705-8BE4-A5535081699D}{66F8194E-DC81-4357-ACBA-0D96A2ECA2A3}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Private Sub btnFiles_Click()

    Dim fd As FileDialog
    Dim imgPath As String
    
    Me.Hide
    
    
    ' Open file dalog
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    
    With fd
        .Filters.Clear
        .Filters.Add "Bilddateien", "*.jpg; *.jpeg; *.png"
        .AllowMultiSelect = False
    
    
        ' Check selection and insert image
        If .Show = -1 Then
            If .SelectedItems.Count > 0 Then
                Application.ScreenUpdating = False
                
                imgPath = .SelectedItems(1)
                ws.Pictures.Insert(imgPath).Select
                
                ' Adapt image position and size
                With Selection.ShapeRange
                    .LockAspectRatio = msoTrue
                    .Width = 200
                    .Top = 100
                    .Left = 100
                End With
                
                ' record inserted image
                newImgs.Add ws.Pictures(ws.Pictures.Count)
                
                Me.Hide
                
                GroupImg.Show vbModeless
                
                Application.ScreenUpdating = True
            End If
            
        Else
            CloseUserForms
            BlockEditing
        End If
    End With
    
End Sub

Private Sub btnOtherMethod_Click()

    Dim shp As Shape
    Dim isNewShape As Boolean
    Dim result As VbMsgBoxResult
    
    Cancel = False
    
    Me.Hide

    OtherMethod.Show vbModeless
    
    ' Surch for inserted image while process is not canceled
    While Not Cancel
        DoEvents
        
        ' Loop through all shapes
        For Each shp In ws.Shapes
            isNewShape = True
            
            ' Compare every shape to previous list of shapes
            For Each existingShape In existingShapes
                If shp.Name = existingShape Then
                    isNewShape = False
                    Exit For
                End If
            Next existingShape
    
            ' record inserted image and start next process step
            If isNewShape And shp.Type = msoPicture Then
                OtherMethod.Hide
                newImgs.Add shp
                Me.Hide
                GroupImg.Show vbModeless
                Exit Sub
            End If
        Next shp
    Wend
End Sub

Public Sub ChooseImg()
    
    Me.Show
    
    ' Initialize list of inserted images
    If newImgs Is Nothing Then
        Set newImgs = New Collection
    End If
    
End Sub

Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)

    ' Unload all UserForms if AddImg is closed
    If CloseMode = vbFormControlMenu Then
        CloseUserForms
        BlockEditing
    End If
    
End Sub

