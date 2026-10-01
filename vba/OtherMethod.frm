Attribute VB_Name = "OtherMethod"
Attribute VB_Base = "0{A8023344-98B3-47BC-A6FB-F708E07D81FE}{596071E7-C677-4B8E-A27F-E6155803AF62}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Private Sub btnCancel_Click()
    
    CloseUserForms
    BlockEditing
    
End Sub


Private Sub UserForm_QueryClose(Cancel As Integer, CloseMode As Integer)
    
    ' Unload all UserForms if OtherMethod is closed
    If CloseMode = vbFormControlMenu Then
        CloseUserForms
        BlockEditing
    End If
    
End Sub

