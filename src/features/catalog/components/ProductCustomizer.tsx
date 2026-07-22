import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShop } from '@/features/cart/store';
import { colors } from '@/shared/theme';
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
export function ProductCustomizer({ product, onClose, onConfirm, fixedQuantity = false, baseIncluded = false }: { product: Product | null; onClose: () => void; onConfirm?: (value: ProductCustomization) => void; fixedQuantity?: boolean; baseIncluded?: boolean }) {
  const add = useShop((state) => state.add);
  const [displayedProduct, setDisplayedProduct] = useState<Product | null>(product);
  const [categories, setCategories] = useState<SideCategory[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setDisplayedProduct(product);
      setCategories(cloneCategories(product));
      setQuantity(1);
      setNote('');
      setError('');
    }
  }, [product]);

  const activeProduct = product || displayedProduct;
  const isVisible = Boolean(product);

  const handleClose = () => {
    console.log('[ProductCustomizer] Closing modal');
    onClose();
  };

  const selectedSides = useMemo<SelectedSide[]>(() => categories.flatMap((category) =>
    category.sides.filter((side) => side.selected).map((side) => ({
      id: side.id, name: side.name, itemId: side.item_id, price: side.price,
      quantity: Math.max(1, Number(side.sel_quantity) || 1),
    }))), [categories]);
  const sidesTotal = selectedSides.reduce((sum, side) => sum + side.price * side.quantity, 0);
  const total = ((baseIncluded ? 0 : activeProduct?.price ?? 0) + sidesTotal) * quantity;

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
        setError(`Puedes elegir un máximo de ${currentStatus.max} en ${category.name}.`);
        return category;
      }
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
      setError(rule.min > 1 ? `Elige al menos ${rule.min} opciones en ${invalid.name}.` : `Elige una opción en ${invalid.name}.`);
      return;
    }
    const value = { selectedSides, note: note.trim() || undefined, quantity };
    if (onConfirm) onConfirm(value); else add(activeProduct, value);
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
            <Text style={s.headerTitle} numberOfLines={1}>Personaliza tu pedido</Text>
            <View style={s.iconButton} />
          </View>
          <ScrollView contentContainerStyle={s.content}>
            <Text style={s.title}>{activeProduct.name}</Text>
          <Text style={s.description}>{activeProduct.description || activeProduct.category}</Text>
          {activeProduct.promotion && !baseIncluded && <View style={s.promotion}><Ionicons name="pricetag" size={15} color="white" /><Text style={s.promotionText}>{activeProduct.promotion.name}</Text></View>}
          <View style={s.priceLine}>{activeProduct.promotion && activeProduct.promotion.type !== 'BUY_X_GET_Y' && activeProduct.originalPrice > activeProduct.price && !baseIncluded ? <Text style={s.oldPrice}>{money(activeProduct.originalPrice)}</Text> : null}<Text style={[s.basePrice, activeProduct.promotion && !baseIncluded ? s.salePrice : null]}>{baseIncluded ? 'Incluido en el combo' : money(activeProduct.price)}</Text></View>
          {categories.map((category) => {
            const categoryStatus = status(category);
            const rule = !category.is_multiple ? 'Elige 1' : categoryStatus.max != null ? `Elige ${categoryStatus.min}–${categoryStatus.max}` : categoryStatus.min ? `Mínimo ${categoryStatus.min}` : 'Opcional';
            return <View key={category.id} style={[s.group, !categoryStatus.valid && error ? s.groupInvalid : null]}>
              <View style={s.groupHeader}><View style={{ flex: 1 }}><Text style={s.groupTitle}>{category.name}</Text><Text style={s.rule}>{rule}</Text></View>{categoryStatus.valid && categoryStatus.min > 0 && <Ionicons name="checkmark-circle" size={22} color={colors.green} />}</View>
              {category.sides.map((side) => <SideRow key={side.id} side={side} onToggle={() => toggle(category.id, side.id)} onQuantity={(delta) => changeSideQuantity(category.id, side.id, delta)} />)}
            </View>;
          })}
          <Text style={s.noteLabel}>Notas para cocina</Text>
          <TextInput value={note} onChangeText={setNote} multiline maxLength={240} placeholder="Ej.: bien cocida, cortar en cuadros…" placeholderTextColor={colors.muted} style={s.note} />
          {error ? <Text style={s.error}>{error}</Text> : null}
          {!fixedQuantity && <View style={s.quantity}><Pressable style={s.qtyButton} onPress={() => setQuantity((q) => Math.max(1, q - 1))}><Ionicons name="remove" size={22} /></Pressable><Text style={s.qtyText}>{quantity}</Text><Pressable style={s.qtyButton} onPress={() => setQuantity((q) => q + 1)}><Ionicons name="add" size={22} /></Pressable></View>}
        </ScrollView>
        <View style={s.footer}><Pressable style={s.confirm} onPress={confirm}><Text style={s.confirmText}>{onConfirm ? 'Confirmar' : 'Agregar'} · {money(total)}</Text></Pressable></View>
      </View>
      ) : null}
    </Modal>
  );
}

function SideRow({ side, onToggle, onQuantity }: { side: SideOption; onToggle: () => void; onQuantity: (delta: number) => void }) {
  const max = Math.max(1, Number(side.max_quantity) || 1);
  return <Pressable onPress={onToggle} style={[s.side, side.selected && s.sideSelected]}>
    {side.image ? <Image source={{ uri: side.image }} style={s.sideImage} /> : null}
    <View style={[s.check, side.selected && s.checkSelected]}>{side.selected && <Ionicons name="checkmark" size={14} color="white" />}</View>
    <View style={{ flex: 1 }}><Text style={s.sideName}>{side.name}</Text><Text style={s.sidePrice}>{side.price > 0 ? `+ ${money(side.price)}` : 'Incluido'}</Text></View>
    {side.selected && max > 1 && <View style={s.sideQty}><Pressable onPress={() => onQuantity(-1)}><Ionicons name="remove" size={18} /></Pressable><Text style={s.sideQtyText}>{side.sel_quantity || 1}</Text><Pressable onPress={() => onQuantity(1)}><Ionicons name="add" size={18} /></Pressable></View>}
  </Pressable>;
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.cream},header:{minHeight:56,paddingTop:4,paddingBottom:4,backgroundColor:'white',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:colors.border},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},headerTitle:{flex:1,textAlign:'center',fontSize:16,fontWeight:'900',color:colors.text},content:{padding:18,paddingBottom:120},title:{fontSize:22,lineHeight:28,fontWeight:'900',color:colors.text},description:{fontSize:14,lineHeight:20,color:colors.muted,marginTop:5},promotion:{alignSelf:'flex-start',marginTop:12,borderRadius:10,backgroundColor:colors.red,paddingHorizontal:9,paddingVertical:6,flexDirection:'row',alignItems:'center',gap:5},promotionText:{fontSize:11,fontWeight:'900',color:'white'},priceLine:{flexDirection:'row',alignItems:'baseline',gap:9,marginTop:10},oldPrice:{fontSize:14,color:colors.muted,textDecorationLine:'line-through'},basePrice:{fontSize:20,fontWeight:'900',color:colors.brown},salePrice:{color:colors.red},group:{backgroundColor:'white',borderRadius:18,padding:14,marginTop:16,borderWidth:1,borderColor:colors.border},groupInvalid:{borderColor:colors.red},groupHeader:{flexDirection:'row',alignItems:'center',marginBottom:8},groupTitle:{fontSize:17,fontWeight:'900',color:colors.text},rule:{fontSize:12,color:colors.muted,marginTop:2},side:{minHeight:58,borderRadius:14,flexDirection:'row',alignItems:'center',gap:11,padding:10,marginTop:7,backgroundColor:colors.cream,borderWidth:1,borderColor:'transparent'},sideSelected:{backgroundColor:colors.yellowSoft,borderColor:colors.yellow},sideImage:{width:42,height:42,borderRadius:11,backgroundColor:colors.yellowSoft},check:{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:'#B8AAA6',alignItems:'center',justifyContent:'center'},checkSelected:{backgroundColor:colors.brown,borderColor:colors.brown},sideName:{fontSize:14,fontWeight:'800',color:colors.text},sidePrice:{fontSize:12,color:colors.muted,marginTop:2},sideQty:{height:34,borderRadius:11,backgroundColor:'white',flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8},sideQtyText:{fontWeight:'900'},noteLabel:{fontSize:16,fontWeight:'900',color:colors.text,marginTop:20,marginBottom:8},note:{minHeight:88,borderRadius:15,backgroundColor:'white',borderWidth:1,borderColor:colors.border,padding:13,textAlignVertical:'top',color:colors.text},error:{color:colors.red,fontSize:13,fontWeight:'800',marginTop:12},quantity:{alignSelf:'center',flexDirection:'row',alignItems:'center',gap:18,marginTop:20},qtyButton:{width:42,height:42,borderRadius:14,backgroundColor:'white',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},qtyText:{fontSize:19,fontWeight:'900'},footer:{position:'absolute',left:0,right:0,bottom:0,padding:16,backgroundColor:'white',borderTopWidth:1,borderTopColor:colors.border},confirm:{height:56,borderRadius:17,backgroundColor:colors.yellow,alignItems:'center',justifyContent:'center'},confirmText:{fontSize:16,fontWeight:'900',color:colors.brown},
});
