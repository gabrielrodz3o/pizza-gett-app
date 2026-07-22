import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShop } from '@/features/cart/store';
import { toast } from '@/shared/components/Toast';
import { haptics } from '@/shared/haptics';
import { colors, font } from '@/shared/theme';
import { Product, SelectedSide, SideCategory, SideOption } from '@/shared/types';

const money = (value: number) => `RD$${value.toLocaleString('es-DO')}`;
const cloneCategories = (product: Product | null): SideCategory[] =>
  (product?.sidesCategories ?? []).map((category) => ({
    ...category,
    sides: category.sides.map((side) => ({ ...side, selected: false, sel_quantity: 1 })),
  }));

const status = (category: SideCategory) => {
  const selected = category.sides.filter((side) => side.selected).length;
  const min = category.is_required ? Math.max(1, Number(category.min_select) || 0) : Number(category.min_select) || 0;
  const max = category.is_multiple ? (category.max_select ?? null) : 1;
  return { selected, min, max, valid: selected >= min && (max == null || selected <= max) };
};

export type ProductCustomization = { selectedSides: SelectedSide[]; note?: string; quantity: number };
export function ProductCustomizer({ product, onClose, onConfirm, fixedQuantity = false, baseIncluded = false, initial }: { product: Product | null; onClose: () => void; onConfirm?: (value: ProductCustomization) => void; fixedQuantity?: boolean; baseIncluded?: boolean; initial?: ProductCustomization }) {
  const add = useShop((state) => state.add);
  const [displayedProduct, setDisplayedProduct] = useState<Product | null>(product);
  const [categories, setCategories] = useState<SideCategory[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setDisplayedProduct(product);
      const cloned = cloneCategories(product);
      if (initial) {
        const byId = new Map(initial.selectedSides.map((side) => [side.id, side]));
        cloned.forEach((category) => category.sides.forEach((side) => {
          const previous = byId.get(side.id);
          if (previous) { side.selected = true; side.sel_quantity = Math.max(1, previous.quantity); }
        }));
      }
      setCategories(cloned);
      setQuantity(Math.max(1, initial?.quantity ?? 1));
      setNote(initial?.note ?? '');
      setError('');
    }
  }, [product]);

  const activeProduct = product || displayedProduct;
  const isVisible = Boolean(product);

  const handleClose = () => {
    onClose();
  };

  const selectedSides = useMemo<SelectedSide[]>(() => categories.flatMap((category) =>
    category.sides.filter((side) => side.selected).map((side) => ({
      id: side.id, name: side.name, itemId: side.item_id, price: side.price,
      quantity: Math.max(1, Number(side.sel_quantity) || 1),
    }))), [categories]);
  const sidesTotal = selectedSides.reduce((sum, side) => sum + side.price * side.quantity, 0);
  const total = ((baseIncluded ? 0 : activeProduct?.price ?? 0) + sidesTotal) * quantity;
  const requiredGroups = categories.filter((category) => status(category).min > 0);
  const completedGroups = requiredGroups.filter((category) => status(category).valid).length;

  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
  const safeBottom = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);

  if (!activeProduct) return null;

  const toggle = (categoryId: number, sideId: number) => {
    setCategories((current) => current.map((category) => {
      if (category.id !== categoryId) return category;
      const selectedSide = category.sides.find((side) => side.id === sideId);
      if (!selectedSide) return category;
      const currentStatus = status(category);
      if (category.is_multiple && !selectedSide.selected && currentStatus.max != null && currentStatus.selected >= currentStatus.max) {
        haptics.warning();
        setError(`Puedes elegir un máximo de ${currentStatus.max} en ${category.name}.`);
        return category;
      }
      haptics.select();
      setError('');
      return {
        ...category,
        sides: category.sides.map((side) => category.is_multiple
          ? side.id === sideId ? { ...side, selected: !side.selected, sel_quantity: 1 } : side
          : { ...side, selected: side.id === sideId ? !side.selected : false, sel_quantity: 1 }),
      };
    }));
  };

  const changeSideQuantity = (categoryId: number, sideId: number, delta: number) => {
    setCategories((current) => current.map((category) => category.id !== categoryId ? category : ({
      ...category,
      sides: category.sides.map((side) => {
        if (side.id !== sideId) return side;
        const max = Math.max(1, Number(side.max_quantity) || 1);
        return { ...side, sel_quantity: Math.min(max, Math.max(1, (Number(side.sel_quantity) || 1) + delta)) };
      }),
    })));
  };

  const confirm = () => {
    if (!activeProduct) return;
    const invalid = categories.find((category) => !status(category).valid);
    if (invalid) {
      const rule = status(invalid);
      haptics.warning();
      setError(rule.min > 1 ? `Elige al menos ${rule.min} opciones en ${invalid.name}.` : `Elige una opción en ${invalid.name}.`);
      return;
    }
    const value = { selectedSides, note: note.trim() || undefined, quantity };
    haptics.press();
    if (onConfirm) onConfirm(value); else { add(activeProduct, value); toast(`${activeProduct.name} agregado al carrito`); }
    handleClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={handleClose}>
      {activeProduct ? (
        <View style={[s.screen, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
          <View style={s.header}>
            <Pressable onPress={handleClose} style={s.iconButton} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
            <View style={{flex:1}}><Text style={s.headerKicker}>CREA TU FAVORITA</Text><Text style={s.headerTitle} numberOfLines={1}>Personaliza tu pizza</Text></View>
            <View style={s.headerCount}><Text style={s.headerCountText}>{completedGroups}/{requiredGroups.length}</Text></View>
          </View>
          <ScrollView contentContainerStyle={s.content}>
            <View style={s.hero}>{activeProduct.image?<ExpoImage source={{uri:activeProduct.image}} transition={250} style={s.heroImage}/>:<View style={s.heroPlaceholder}><Ionicons name="pizza" size={86} color={colors.brown}/></View>}<View style={s.heroShade}/>{activeProduct.promotion&&!baseIncluded&&<View style={s.promotion}><Ionicons name="pricetag" size={14} color="white"/><Text style={s.promotionText}>{activeProduct.promotion.name}</Text></View>}<View style={s.heroPrice}>{activeProduct.promotion&&activeProduct.promotion.type!=='BUY_X_GET_Y'&&activeProduct.originalPrice>activeProduct.price&&!baseIncluded?<Text style={s.oldPrice}>{money(activeProduct.originalPrice)}</Text>:null}<Text style={s.heroPriceText}>{baseIncluded?'Incluido':money(activeProduct.price)}</Text></View></View>
            <View style={s.productIntro}><View style={{flex:1}}><Text style={s.productKicker}>{activeProduct.category.toUpperCase()}</Text><Text style={s.title}>{activeProduct.name}</Text><Text style={s.description}>{activeProduct.description||'Preparada al momento con ingredientes frescos.'}</Text></View></View>
            {requiredGroups.length>0&&<View style={s.progressCard}><View style={s.progressTop}><Text style={s.progressTitle}>Tu personalización</Text><Text style={s.progressValue}>{completedGroups===requiredGroups.length?'¡Lista!':`${completedGroups} de ${requiredGroups.length}`}</Text></View><View style={s.progressTrack}><View style={[s.progressFill,{width:`${requiredGroups.length?completedGroups/requiredGroups.length*100:100}%`}]} /></View><Text style={s.progressHint}>{completedGroups===requiredGroups.length?'Completaste todas las elecciones requeridas.':'Completa los pasos marcados como requeridos.'}</Text></View>}
          {categories.map((category,categoryIndex) => {
            const categoryStatus = status(category);
            const rule = !category.is_multiple ? 'Elige 1' : categoryStatus.max != null ? `Elige ${categoryStatus.min}–${categoryStatus.max}` : categoryStatus.min ? `Mínimo ${categoryStatus.min}` : 'Opcional';
            return <View key={category.id} style={[s.group, !categoryStatus.valid && error ? s.groupInvalid : null]}>
              <View style={s.groupHeader}><View style={[s.stepNumber,categoryStatus.valid&&categoryStatus.min>0&&s.stepNumberDone]}>{categoryStatus.valid&&categoryStatus.min>0?<Ionicons name="checkmark" size={15} color="white"/>:<Text style={s.stepNumberText}>{categoryIndex+1}</Text>}</View><View style={{ flex: 1 }}><Text style={s.groupTitle}>{category.name}</Text><Text style={s.rule}>{rule}</Text></View><View style={[s.ruleBadge,categoryStatus.min>0?s.ruleBadgeRequired:s.ruleBadgeOptional]}><Text style={s.ruleBadgeText}>{categoryStatus.min>0?'REQUERIDO':'OPCIONAL'}</Text></View></View>
              {category.sides.map((side) => <SideRow key={side.id} side={side} onToggle={() => toggle(category.id, side.id)} onQuantity={(delta) => changeSideQuantity(category.id, side.id, delta)} />)}
            </View>;
          })}
          <View style={s.noteHead}><View style={s.noteIcon}><Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.brown}/></View><View><Text style={s.noteLabel}>Indicaciones para cocina</Text><Text style={s.noteHelp}>Opcional · máximo 240 caracteres</Text></View></View>
          <TextInput value={note} onChangeText={setNote} multiline maxLength={240} placeholder="Ej.: bien cocida, cortar en cuadros…" placeholderTextColor={colors.muted} style={s.note} />
          {error ? <Text style={s.error}>{error}</Text> : null}
        </ScrollView>
        <View style={s.footer}>{!fixedQuantity&&<View style={s.quantity}><Pressable accessibilityRole="button" accessibilityLabel="Disminuir cantidad" style={s.qtyButton} onPress={()=>{haptics.tap();setQuantity(q=>Math.max(1,q-1));}}><Ionicons name="remove" size={20} color={colors.brown}/></Pressable><Text style={s.qtyText}>{quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel="Aumentar cantidad" style={s.qtyButton} onPress={()=>{haptics.tap();setQuantity(q=>q+1);}}><Ionicons name="add" size={20} color={colors.brown}/></Pressable></View>}<Pressable style={s.confirm} onPress={confirm}><View><Text style={s.confirmKicker}>{onConfirm?'GUARDAR ELECCIONES':'AGREGAR AL CARRITO'}</Text><Text style={s.confirmText}>{money(total)}</Text></View><Ionicons name="arrow-forward" size={21} color={colors.brown}/></Pressable></View>
      </View>
      ) : null}
    </Modal>
  );
}

function SideRow({ side, onToggle, onQuantity }: { side: SideOption; onToggle: () => void; onQuantity: (delta: number) => void }) {
  const max = Math.max(1, Number(side.max_quantity) || 1);
  return <Pressable onPress={onToggle} style={[s.side, side.selected && s.sideSelected]}>
    {side.image ? <ExpoImage source={{ uri: side.image }} transition={200} style={s.sideImage} /> : null}
    <View style={[s.check, side.selected && s.checkSelected]}>{side.selected && <Ionicons name="checkmark" size={14} color="white" />}</View>
    <View style={{ flex: 1 }}><Text style={s.sideName}>{side.name}</Text><Text style={s.sidePrice}>{side.price > 0 ? `+ ${money(side.price)}` : 'Incluido'}</Text></View>
    {side.selected && max > 1 && <View style={s.sideQty}><Pressable onPress={() => onQuantity(-1)}><Ionicons name="remove" size={18} /></Pressable><Text style={s.sideQtyText}>{side.sel_quantity || 1}</Text><Pressable onPress={() => onQuantity(1)}><Ionicons name="add" size={18} /></Pressable></View>}
  </Pressable>;
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:'#F8F3EE'},header:{minHeight:64,paddingVertical:6,backgroundColor:'white',flexDirection:'row',alignItems:'center',paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:'#E9DED7',gap:6},iconButton:{width:44,height:44,borderRadius:15,backgroundColor:'#F6F0EC',alignItems:'center',justifyContent:'center'},headerKicker:{fontSize: 10,fontFamily: font.black,letterSpacing:1.2,color:colors.orange},headerTitle:{fontSize:16,fontFamily: font.black,color:colors.text,marginTop:1},headerCount:{minWidth:42,height:30,paddingHorizontal:8,borderRadius:10,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center'},headerCountText:{fontSize:11,fontFamily: font.black,color:colors.brown},
  content:{paddingBottom:150},hero:{height:255,backgroundColor:'#E8DDD6',overflow:'hidden'},heroImage:{width:'100%',height:'100%',resizeMode:'cover'},heroPlaceholder:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.yellowSoft},heroShade:{position:'absolute',left:0,right:0,top:0,bottom:0,backgroundColor:'rgba(35,10,6,.08)'},promotion:{position:'absolute',left:16,top:16,borderRadius:11,backgroundColor:colors.red,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:5},promotionText:{fontSize:10,fontFamily: font.black,color:'white'},heroPrice:{position:'absolute',right:16,bottom:15,alignItems:'flex-end',backgroundColor:'rgba(255,255,255,.94)',paddingHorizontal:13,paddingVertical:9,borderRadius:13},oldPrice:{fontSize:10,color:colors.muted,textDecorationLine:'line-through'},heroPriceText:{fontSize:18,fontFamily: font.black,color:colors.brown},
  productIntro:{backgroundColor:'white',paddingHorizontal:18,paddingTop:19,paddingBottom:20,borderBottomLeftRadius:24,borderBottomRightRadius:24},productKicker:{fontSize: 10,fontFamily: font.black,letterSpacing:1.4,color:colors.orange},title:{fontSize:30,lineHeight:33,fontFamily:font.display,letterSpacing:.4,color:colors.text,marginTop:4},description:{fontSize:12,lineHeight:18,color:colors.muted,marginTop:6},
  progressCard:{marginHorizontal:16,marginTop:15,backgroundColor:colors.brown,borderRadius:18,padding:15},progressTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},progressTitle:{fontSize:13,fontFamily: font.black,color:'white'},progressValue:{fontSize:11,fontFamily: font.black,color:colors.yellow},progressTrack:{height:7,borderRadius:4,backgroundColor:'rgba(255,255,255,.15)',overflow:'hidden',marginTop:11},progressFill:{height:'100%',borderRadius:4,backgroundColor:colors.yellow},progressHint:{fontSize: 10,color:'#DEC6BF',marginTop:7},
  group:{backgroundColor:'white',borderRadius:20,padding:14,marginHorizontal:16,marginTop:13,borderWidth:1,borderColor:'#E9DED7'},groupInvalid:{borderColor:colors.red,borderWidth:1.5},groupHeader:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:8},stepNumber:{width:34,height:34,borderRadius:12,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center'},stepNumberDone:{backgroundColor:colors.green},stepNumberText:{fontSize:12,fontFamily: font.black,color:colors.brown},groupTitle:{fontSize:16,fontFamily: font.black,color:colors.text},rule:{fontSize:10,color:colors.muted,marginTop:2},ruleBadge:{borderRadius:8,paddingHorizontal:7,paddingVertical:5},ruleBadgeRequired:{backgroundColor:'#FBE9E7'},ruleBadgeOptional:{backgroundColor:'#F2EEEB'},ruleBadgeText:{fontSize: 10,fontFamily: font.black,letterSpacing:.6,color:colors.brown},
  side:{minHeight:62,borderRadius:15,flexDirection:'row',alignItems:'center',gap:11,padding:10,marginTop:7,backgroundColor:'#F8F3EE',borderWidth:1.5,borderColor:'transparent'},sideSelected:{backgroundColor:colors.yellowSoft,borderColor:colors.yellow},sideImage:{width:45,height:45,borderRadius:13,backgroundColor:colors.yellowSoft},check:{width:23,height:23,borderRadius:12,borderWidth:2,borderColor:'#B8AAA6',alignItems:'center',justifyContent:'center'},checkSelected:{backgroundColor:colors.brown,borderColor:colors.brown},sideName:{fontSize:13,fontFamily: font.black,color:colors.text},sidePrice:{fontSize:10,color:colors.muted,marginTop:3},sideQty:{height:36,borderRadius:12,backgroundColor:'white',flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8},sideQtyText:{fontFamily: font.black,color:colors.brown},
  noteHead:{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:18,marginTop:20,marginBottom:9},noteIcon:{width:38,height:38,borderRadius:13,backgroundColor:colors.yellowSoft,alignItems:'center',justifyContent:'center'},noteLabel:{fontSize:14,fontFamily: font.black,color:colors.text},noteHelp:{fontSize: 10,color:colors.muted,marginTop:2},note:{minHeight:92,borderRadius:16,backgroundColor:'white',borderWidth:1,borderColor:'#E9DED7',padding:13,textAlignVertical:'top',color:colors.text,marginHorizontal:16},error:{color:colors.red,fontSize:12,fontFamily: font.extraBold,marginHorizontal:18,marginTop:12},
  quantity:{height:54,borderRadius:17,backgroundColor:'#F6F0EC',flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:6},qtyButton:{width:40,height:40,borderRadius:13,backgroundColor:'white',alignItems:'center',justifyContent:'center'},qtyText:{fontSize:18,fontFamily: font.black,color:colors.text,minWidth:24,textAlign:'center'},footer:{position:'absolute',left:0,right:0,bottom:0,paddingHorizontal:14,paddingTop:12,paddingBottom:14,backgroundColor:'white',borderTopWidth:1,borderTopColor:'#E9DED7',flexDirection:'row',gap:10},confirm:{height:54,borderRadius:17,backgroundColor:colors.yellow,flex:1,paddingHorizontal:17,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},confirmKicker:{fontSize: 10,fontFamily: font.black,letterSpacing:.8,color:colors.brown},confirmText:{fontSize:16,fontFamily: font.black,color:colors.brown,marginTop:2},
});
